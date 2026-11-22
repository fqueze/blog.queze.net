---
title: "Debugging a Windows crash that left no crash report"
date: 2026-11-23T00:03:00
category: Mozilla
tags: [debugging]
---
How, without ever starting my Windows laptop, I understood why Firefox crashes on Windows when opening its 500th window. From a crash that left nothing but an exit code to a fix that landed only a few hours later!

## The symptom

Two changes landed on the same day: the mochitest harness started to [fail the running test when the browser exits abnormally without a minidump](https://bugzilla.mozilla.org/show_bug.cgi?id=2090907), and [`mochitest-browser-chrome-repeat` jobs started running on autoland and mozilla-central](https://bugzilla.mozilla.org/show_bug.cgi?id=2092566). Together, they made the aiwindow manifest perma-fail on Windows 11 with "application terminated with exit code 3762701893".

No minidump, no stack, nothing else to look at. The only useful observation was that the failure was deterministic: the browser always died at about the same point of the run, after roughly 14 minutes. Something was accumulating.

A quick online search gave only one result about this exit code (0xE0464645 in hexadecimal): a [bug write-up in Chinese](https://github.com/hajisensai/Fushi/blob/main/docs/bugs/BUG-289-dcomp-compositor-atexit-failfast.md) for another project, analyzing crash dumps with the same exception code. Their stacks show it's raised by `CoreMessaging!CFlat::Abandonment::Fail` calling [`RaiseFailFastException`](https://learn.microsoft.com/en-us/windows/win32/api/errhandlingapi/nf-errhandlingapi-raisefailfastexception), which "bypasses all exception handlers": this is why our crash reporter never saw anything. A Windows UI component giving up after 14 minutes of tests suggested it was running out of something.

## Measuring resources after each test

Finding out what only required adding a few lines to the browser-chrome harness (`browser-test.js`) to log, after each test, the parent process's GDI and USER object counts, handle count, and private and committed memory:

```js
let GetGuiResources = user32.declare(
  "GetGuiResources",
  ctypes.winapi_abi,
  ctypes.uint32_t,
  ctypes.voidptr_t,
  ctypes.uint32_t
);
let proc = GetCurrentProcess();
parts.push(`gdi ${GetGuiResources(proc, 0)}`);
parts.push(`gdiPeak ${GetGuiResources(proc, 2)}`);
parts.push(`user ${GetGuiResources(proc, 1)}`);
parts.push(`userPeak ${GetGuiResources(proc, 4)}`);
// ... handle count, private bytes, system commit, kernel pools ...
dump(`DEBUG-RESOURCES | ${parts.join(" | ")}\n`);
```

Using ctypes means no compilation is needed, so the try pushes could use artifact builds to iterate quickly.

The answer was clear: the number of GDI objects climbed steadily from 45 to 9,950–9,999 after the last test that completed, and the peak value reported by Windows was exactly 10,000. 10,000 is the maximum number of GDI objects a Windows process can own. Nothing else was anywhere near a limit.

## A smaller test case

The Smart Window tests open and close a lot of windows, about 500 in a single browser session, so opening windows was the obvious suspect. A new test opening and closing 30 browser windows, in its own folder so it can run alone on try and give fast results, confirmed it, and showed the problem had nothing to do with Smart Window: each window leaked about 20 GDI objects, never released, even after memory minimization.

## Which objects? Walking the GDI handle table

Again, some help was found on GitHub: a [gdi-leaks](https://github.com/Softanics/gdi-leaks) project has code reading the GDI handle table that Windows maps into every process. Still from ctypes, this table can be accessed from an undocumented field (`GdiSharedHandleTable`) of a per-process Windows structure, keeping the entries owned by our process, and asking GDI for the type and size of each object:

```js
// GdiSharedHandleTable, undocumented, at 0xF8 on x64.
let table = ctypes.cast(
  ctypes
    .cast(peb, ctypes.uint8_t.array(0x100).ptr)
    .contents.addressOfElement(0xf8),
  ctypes.voidptr_t.ptr
).contents;
// 65536 cells of 24 bytes: kernel pointer, pid, count, upper, type, user
// pointer.
let cells = ctypes.cast(
  table,
  ctypes.uint16_t.array(65536 * 12).ptr
).contents;
let pid = GetCurrentProcessId() & 0xffff;
for (let i = 0; i < 65536; i++) {
  if (cells[i * 12 + 4] != pid) {
    continue;
  }
  let handle = ctypes.cast(
    ctypes.uintptr_t(cells[i * 12 + 6] * 65536 + i),
    ctypes.voidptr_t
  );
  let type = TYPES[GetObjectType(handle) - 1];
  if (type == "BITMAP" && GetObjectW(handle, BITMAP.size, bitmap.address())) {
    type += ` ${bitmap.bmWidth}x${bitmap.bmHeight}`;
  }
  counts[type] = (counts[type] || 0) + 1;
}
```

Before and after opening and closing 30 windows, this gives:

| GDI objects     | Before | After 30 windows |
|-----------------|-------:|-----------------:|
| Memory device contexts (DCs) | 7 | **303** |
| Bitmaps 64×32   |      3 |          **177** |
| Bitmaps 64×64   |      1 |           **91** |
| Bitmaps 32×32   |      1 |           **33** |
| Regions         |      8 |                8 |
| Brushes         |      2 |                2 |
| Fonts           |      2 |                2 |
| Bitmaps 8×8     |      1 |                1 |
| **Total**       |     43 |          **635** |

So each window leaves behind about 10 memory DCs and 10 small bitmaps of 64×32, 64×64 and 32×32 pixels.

## Who allocates them?

Each leaked bitmap comes with a memory DC: that's the pair Windows creates when graphics code asks for a DC to draw with GDI into a GPU surface. With hooks on the native functions that create this pair (`NtGdiDdDDICreateDCFromMemory`) and destroy it (`NtGdiDdDDIDestroyDCFromMemory`), the Firefox Profiler can record markers with stacks for each call:

```cpp
static LONG NTAPI CreateHook(CreateArgs* aArgs) {
  LONG status = sCreateStub(aArgs);
  if (status >= 0) {
    PROFILER_MARKER_TEXT(
        "GDI CreateDCFromMemory", GRAPHICS, MarkerStack::Capture(),
        nsPrintfCString("DC %08x bitmap %08x %ux%u", Handle(aArgs->mDc),
                        Handle(aArgs->mBitmap), aArgs->mWidth,
                        aArgs->mHeight));
  }
  return status;
}

static LONG NTAPI DestroyHook(const DestroyArgs* aArgs) {
  PROFILER_MARKER_TEXT(
      "GDI DestroyDCFromMemory", GRAPHICS, MarkerStack::Capture(),
      nsPrintfCString("DC %08x bitmap %08x", Handle(aArgs->mDc),
                      Handle(aArgs->mBitmap)));
  return sDestroyStub(aArgs);
}

static void Install() {
  sWin32uIntercept.Init("win32u.dll");
  sCreateStub.Set(sWin32uIntercept, "NtGdiDdDDICreateDCFromMemory",
                  &CreateHook);
  sDestroyStub.Set(sWin32uIntercept, "NtGdiDdDDIDestroyDCFromMemory",
                   &DestroyHook);
}
```

The mochitest harness profiles every test, but to keep the overhead low it doesn't walk native stacks, so marker stacks only contain JS frames. Pushing to try with `--profiler` gives a normally configured profiler, with native stacks. The harness only uploads profiles of failing tests, so the test ends with an assertion that always fails.

[Here is the resulting profile](https://share.firefox.dev/4zWP4b7), filtered to show only the new markers. There are 428 `GDI CreateDCFromMemory` markers and 127 `GDI DestroyDCFromMemory` markers. Pairing them by handle leaves 301 DCs that are never destroyed: 177 with a 64×32 bitmap, 91 with a 64×64 one and 33 with a 32×32 one, exactly the bitmaps found in the handle table at the end of the test.

Here is the stack of [one of the leaked DCs](https://share.firefox.dev/4A1uV3X), innermost frame first:

```
D3D10Warp.dll!UMDevice::InternalGetDC
d3d11.dll!NDXGI::CResource::CGdiInterop::GetDC
d3d11.dll!NDXGI::CResource::GetDCCore
Microsoft.UI.Windowing.Core.dll!CTitleBar::PaintButton
Microsoft.UI.Windowing.Core.dll!CTitleBar::UpdateButtonState
Microsoft.UI.Windowing.Core.dll!CTitleBar::UpdateAllButtonStates
Microsoft.UI.Windowing.Core.dll!CTitleBar::UpdateColors
Microsoft.UI.Windowing.Core.dll!CTitleBar::UpdateExtendsContentIntoTitleBar
Microsoft.UI.Windowing.Core.dll!...::put_ExtendsContentIntoTitleBar
xul.dll!WindowsUIUtils::SetIsTitlebarCollapsed
xul.dll!nsWindow::SetCustomTitlebar
```

The leaked objects are the images of the title bar buttons and icon. To draw its tabs in the title bar, Firefox asks the Windows App SDK (`Microsoft.UI.Windowing.Core.dll`) to let the window content extend into the title bar, and the SDK then paints these buttons itself.

The destroy markers explain why some are freed and others aren't. Each window creates 14 DCs while setting up its title bar. When the window is closed, [4 of them are destroyed](https://share.firefox.dev/4eS7XDT), all at once, when their surface is destroyed while DirectComposition commits (`CTitleBar::CommitDCompDevice`, called from `nsWindow::Show(false)` in `AppWindow::Destroy`). The 10 others are never destroyed. My understanding is that they live as long as the title bar object, which nothing destroys when the window is closed. This looks like a bug in the Windows App SDK.

## The fix

[The fix](https://phabricator.services.mozilla.com/D344974) is to undo the extension of the window content into the title bar, resetting it to its default state, before destroying the window:

```cpp
  // Destroying the window doesn't release the GDI objects the Windows App SDK
  // allocates for a title bar extended into the client area, so undo that
  // first.
  if (mCustomNonClient) {
    WindowsUIUtils::SetIsTitlebarCollapsed(mWnd, false);
  }
```

Each window leaked 20 of the 10,000 GDI objects a process can own, hence the crash around the 500th window. With the fix, closing a window leaks 0 GDI objects, and Firefox can now open more than 500 windows on Windows without crashing. This landed in [bug 2096020](https://bugzilla.mozilla.org/show_bug.cgi?id=2096020).

## How it really happened

The story above is the method I would follow next time, but a few things happened slightly differently. Claude found the fix before having the stacks. Once it was clear that each window leaked 20 objects, Claude proposed variants to test on try: popups, a chrome window without a title bar, `browser.tabs.inTitlebar=0`, disabling Mica. Only browser windows drawing tabs in the title bar leaked. Claude then read the code of that path, found the `SetIsTitlebarCollapsed` call, and tested resetting it behind a pref: that removed the leak. The clean profile shared above came last, when preparing this blog post. The profiles produced during the actual investigation were a bit messier, as they hooked several other GDI functions (creating DIB sections, compatible DCs and bitmaps), and at first not the one Direct3D uses to create the leaked DCs.

## Things to take away

- To investigate a resource leak, start by measuring resources after each test. ctypes in the test harness gives answers on try without compiling anything.
- Walking the tables the OS keeps for the process shows what the leaked objects look like, which gives a hint about which functions to watch.
- Profiler markers with native stacks show what happens inside the OS: a nice way to pinpoint the code responsible for a leak without guessing.
- All of this works in try pushes, without a machine reproducing locally, and mostly with artifact builds: only the native hooks and the patch itself needed full builds.
