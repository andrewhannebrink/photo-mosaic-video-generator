import os
import random
import sys
from PIL import Image, ImageDraw

def connectImgs(img1, img2, scale1, buf = (0, 0), w = False):
   #img1 = makeImgBlack(img1)
   #img2 = makeImgBlack(img2)
   (w1, h1) = img1.size
   (w2, h2) = img2.size
   white = Image.new('RGB', (h2,h2), (255,255,255))
   img1 = img1.resize((int(scale1*w1), int(scale1*h1)), Image.ANTIALIAS)
   if w == False:
      white.paste(img1, buf) 
   new = Image.new('RGB', (h2 + w2, h2), (255,255,255))
   new.paste(white, (0, 0))
   new.paste(img2, (h2, 0))
   (nw, nh) = new.size
   ctrbuf = (1920/2 - nw/2, 1080/2 - nh/2)
   frameImg = Image.new('RGB', (1920, 1080), (255,255,255)) 
   frameImg.paste(new, ctrbuf)
   return frameImg

def makeImgBlack(img):
   (w, h) = img.size
   pix = img.load()
   print w, h
   for x in range(w):
      for y in range(h):
         (r,g,b,a) = pix[x, y]
         if a == 0:
            pix[x, y] = (0,0,0,1)
   img.convert('RGB')
   return img

def makeNumStr(n):
   if len(str(n)) == 1:
      n = '00'+str(n)
   if len(str(n)) == 2:
      n = '0'+str(n)
   else:
      n = str(n)
   return n

def makeScrollAnim(frames, speed, imgs, textImg, opdir = 'logomov/'):
   i = 1
   while i <= frames:
      iconImg = random.choice(imgs) 
      while iconImg.size != (32, 32):
          iconImg = random.choice(imgs)
      img = connectImgs(iconImg, textImg, 3.6, (18, 30) )
      for s in range(speed):
         opName = 'anim' + makeNumStr(i) + '.png'
         img.save(opdir + opName)
         i += 1
   return i

def makeBlinkAnim(frames, finalImg, textImg, frame, blinkSpeed = 40, opdir = 'logomov/'):
   i = frame
   on = connectImgs(finalImg, textImg, 3.6, (18, 30))
   off = connectImgs(finalImg, textImg, 3.6, buf = (18, 30), w = True)
   while i <= frame + frames:
      for s in range(blinkSpeed):
         if ((s-frame) % blinkSpeed) < (blinkSpeed/2):
            img = on
         else:
            img = off
         opName = 'anim' + makeNumStr(i) + '.png'
         img.save(opdir + opName)
         i += 1
      

def main():
   scrollFrames = 60
   blinkFrames = 160
   speed = 1
   textImg = 'tiny_icon2.png'
   imgDir = '/home/brink/photo-mosaic-video-generator/win/'
   finalImg = '/home/brink/photo-mosaic-video-generator/win/inetwiz_100-0.png'
   textImg = Image.open(textImg).convert('RGBA')
   finalImg = Image.open(finalImg).convert('RGBA')
   lilImgs = []
   for n in os.listdir(imgDir):
      imgPath = imgDir + n
      img = Image.open(imgPath)
      lilImgs.append(img) 
   frame = makeScrollAnim(scrollFrames, speed, lilImgs, textImg)
   makeBlinkAnim(blinkFrames, finalImg, textImg, frame)
   

if __name__ == '__main__':
   sys.exit(main())
