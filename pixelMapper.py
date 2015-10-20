import sys
import os
from PIL import Image, ImageDraw
from random import randint
import argparse

def compress(color, fact):
   c = (color[0]/fact, color[1]/fact, color[2]/fact)
   return (c[0]*fact, c[1]*fact, c[2]*fact)

def initPixMap(fact, filt, keepWhite = True):
   m = {}
   for r in range(256/fact):
      for g in range(256/fact):
         for b in range(256/fact):
            if keepWhite==True and (r*fact)>(256-fact*2) and (g*fact)>(256-fact*2) and (b*fact)>(256-fact*2):
               m[(r*fact, g*fact, b*fact)] = [255, 255, 255]
            else:
               rv = randint(filt[0][0], filt[0][1])
               gv = randint(filt[1][0], filt[1][1])
               bv = randint(filt[2][0], filt[2][1])
               m[(r*fact, g*fact, b*fact)] = [rv, gv, bv]
   return m

def getPixMap(fact, mode, filt, glowGlider, keepWhite = True):
   if mode == 'flicker':
      return initPixMap(fact, filt, keepWhite)
   elif mode == 'glow':
      glowGlider.step()
      return glowGlider.m


class GlowGlider:
   def __init__(self, fact, filt, colVec, keepWhite = True):
      self.colVec = colVec
      self.filt = filt
      self.m = initPixMap(fact, filt, keepWhite)

   def step(self):
      for k in self.m:
         for n in range(3):
            future = self.m[k][n] + self.colVec[n]
            if (future < self.filt[n][0]) | (future > self.filt[n][1]):
               self.colVec[n] *= -1
            else:
               self.m[k][n] = future
  

def pixelMapSeq(ipdir, opdir, pics, mode, filt, keepWhite = True):
   if mode == 'glow':
      pics.sort() 
      fact = 64 # fact must be constant in glow mode
      colVec = [1, -1, 1]
      glowGlider = GlowGlider(fact, filt, colVec)
   elif mode == 'flicker':
      glowGlider = None
   for pic in pics:
      if pic == 'white.png':
         continue
      if mode == 'flicker':
         fact =  128 
         #fact = 2**randint(3, 7) # fact can be random in flicker mode
         #fact = 2**6
      ip = Image.open(ipdir + pic).convert('RGB')
      cp = Image.new('RGB', ip.size, 'black')
      ipix = ip.load()
      cpix = cp.load()
      for x in range(cp.size[0]):
         for y in range(cp.size[1]):
            p = compress(ipix[x, y], fact)
            cpix[x, y] = p
      op = Image.new('RGB', ip.size, 'black')
      opix = op.load()
      m = getPixMap(fact, mode, filt, glowGlider, keepWhite)
      for x in range(op.size[0]):
         for y in range(op.size[1]):
            t = tuple(cpix[x, y])
            opix[x, y] = tuple(m[t])
      op.save(opdir + pic)


def main():
   ipdir = './poke/'
   opdir = './pokec/'
   pics = os.listdir(ipdir)
   modes = ['flicker', 'glow']
   mode = modes[0];
   filt = [[0, 255], [0, 255], [0, 255]]
   keepWhite = False 

   pixelMapSeq(ipdir, opdir, pics, mode, filt, keepWhite)
   return 0
   

if __name__ == '__main__':
  sys.exit(main())
