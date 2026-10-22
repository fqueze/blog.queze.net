---
title: "Microsoft Office Picture Manager - Compresser les images"
date: 2006-05-26T19:06:44
updated: 2014-01-20T23:44:05Z
url: "2006/05/26/Microsoft-Office-Picture-Manager-Compresser-les-images"
id: 24
guid: urn:md5:f8641d8e791731ce3d779d159e961181
lang: fr
tags: ["Erreurs"]
http: true
templateEngineOverride: html
---

   <p>Alors par une belle après-midi d'une semaine de révisions, nous voila Eventreur et moi en train d'ouvrir une petite image (une flèche utilisée pour un bouton sur un site web) avec Microsoft Office Picture Manager. Sur un côté de la fenêtre, nous remarquons un volet "Compresser les images". Intéressé, Eventreur se dit que peut-être cela lui permettra de réduire un petit peu la taille de son fichier (déjà léger). Nous tentons donc, non sans enthousiasme <img src="/smileys/clin_d'oeil.png" alt=";-)" /> les magnifiques fonctions qui s'offrent à nous, tout en observant la taille totale estimée. Voici les images correspondant aux essais des l'options "Compresser pour Pages Web" et "Compresser pour Documents"&nbsp;:</p>
<p><img src="/pict/picturemanager_web.png" alt="Compresser pour Pages Web, l'image passe de 862 octets à 37 kilo octets&nbsp;!!!" /></p>
<p><img src="/pict/picturemanager_doc.png" alt="Compresser pour Documents, l'image passe de 862 octets à 193 kilo octets&nbsp;!!!" /></p>
<p>Les résultats sont tout simplement impressionants, consternants...</p>
<p>Après avoir bien étudié ce qui est écrit sur ces captures d'écran, il semblerait que cette fonction de « Compression des images » soit en fait une fonction de redimensionnement, et que lorsqu'on lui demande de compresser une image, il la convertisse à une taille prédéfinie en fonction de la cible choisie. Et il effectue cette « compression » (!!) même si l'image originale contient moins de pixels que l'image qu'il obtiendrait suite à ce traitement.</p>
