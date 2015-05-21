#!/usr/bin/python

import math
import movieMaker
import remoji
from PIL import Image
import os



class Spectrum:
	def __init__(self, levelsPerColor, pivotColors, lilImgDir, littleImgs, colorMap, whiteSquare, noPics = False, skipEvery = 1):
		self.levelsPerColor = levelsPerColor
		self.pivotColors = pivotColors
		self.colors = self.getSpectrumColors()
		self.lilImgDir = lilImgDir
		self.whiteSquare = whiteSquare
		if noPics == False:
			#MAKE GETIMGS() TAKE COLORMAP AS A PARAM
			#self.imgs = self.getImgs(colorMap)
			self.imgs = self.getImgs(colorMap, littleImgs)
			print 'self.imgs:', self.imgs
		self.skipEvery = skipEvery
	
	#RETURNS A LIST OF ALL THE SPECTRUM COLORS. RUNS WHEN A SPECTRUM IS INSTANTIATED.
	def getSpectrumColors(self):
		spectrumColors = []
		for i in range(0, len(self.pivotColors)-1):
			disVec = (self.pivotColors[i + 1][0] - self.pivotColors[i][0], self.pivotColors[i + 1][1] - self.pivotColors[i][1], self.pivotColors[i + 1][2] - self.pivotColors[i][2])
			approxRStep = disVec[0] / float(self.levelsPerColor) 
			approxGStep = disVec[1] / float(self.levelsPerColor)
			approxBStep = disVec[2] / float(self.levelsPerColor) 
			for l in range(0, self.levelsPerColor):
				r = int(self.pivotColors[i][0] + round(l * approxRStep))
				g = int(self.pivotColors[i][1] + round(l * approxGStep))
				b = int(self.pivotColors[i][2] + round(l * approxBStep))
				spectrumColor = (r, g, b)
				spectrumColors.append(spectrumColor)
		spectrumColors.pop(0)
		return spectrumColors
	
	#RETURNS A LIST OF ALL THE SPECTRUM IMAGES. RUNS WHEN A SPECTRUM IS INSTANTIATED.
	def getImgs(self, colorMap, littleImgs):
		spectrumImgs = []
		closestImgCheatSheet = {}
		for i in range(0, len(self.colors)):
			closestImg = remoji.getClosestImg(self.colors[i], littleImgs, colorMap, self.lilImgDir, oneColor = True)
			print 'closestImg:', closestImg
			spectrumImgs.append(closestImg)
		return spectrumImgs

	#RETURNS A UNIQUE STRING IDENTIFIER FOR THE SPECTRUM. USED IN PREPROC.PY FOR SAVING SPECTRUMS TO DIRECTORIES WITH UNIQUE NAMES, AND SOMETIMES BY THE SPECTRUM CONSTRUCTOR TO SAVE COMPUTING TIME IF THE SPECTRUM ALREADY EXISTS IN A DIRECTORY.
	def namify(self):
		dirName = 'spec-' + self.lilImgDir[:-1]
		for i in range(0, len(self.pivotColors)):
			for c in range(0, len(self.pivotColors[i])):
				dirName += str(self.pivotColors[i][c])
		dirName += str(self.levelsPerColor)
		if self.whiteSquare == True:
			dirName += 'w'
		dirName += '/'
		return dirName

	#THE NAME IS PRETTY SELF EXPLANATORY
	def copyImgsToDir(self, directory):
		movieMaker.wipeDir(directory)
		#print len(self.imgs)
		if self.whiteSquare == True:
			img = Image.new('RGB', (64, 64),'white')
			img.save(directory + 'white.png')
		for img in self.imgs:
			#print 'cp ' + self.lilImgDir + img + ' ' + directory + img
			os.system('cp ' + self.lilImgDir + img + ' ' + directory + img)
			

	#MAKE A VISUAL REPRESENTATION OF THE SPECTRUM AND WRITE IT TO 'SPECTRUM.PNG'.
	def disp(self):
		img = Image.new('RGB', (64*len(self.colors), 128),'white')
		imgBool = True
		for i in range(0, len(self.colors)):
			if i % self.skipEvery is 0: 
				emo = Image.open(self.lilImgDir + self.imgs[i].name)
				img.paste(emo, (i * 64, 64))
			colBox = Image.new('RGB', (64,64), self.colors[i])
			img.paste(colBox, (i * 64, 0))
		img.save('spectrum.png')
		print 'spectrum saved as "spectrum.png"'

#RETURNS A LIST OF SPECTRUMS THAT FORM A GRADIENT FROM THE FIRST TO THE LAST
def make2dSpectrum(l, spec1, spec2, lilImgDir, littleImgs, colorMap):
	vertSpecs = []
	finalSpecs = []
	for i in range(0, len(spec1.pivotColors)):
		vertSpecs.append(Spectrum(l + 1, (spec1.pivotColors[i], spec2.pivotColors[i]), lilImgDir, littleImgs, colorMap, spec1.whiteSquare, noPics = True))
		#print 'vertSpec created'
	for i in range(0, l):
		newPivotColors = []
		for v in range(0, len(vertSpecs)):
			newPivotColors.append(vertSpecs[v].colors[i])
		spec = Spectrum(spec1.levelsPerColor, newPivotColors, lilImgDir, littleImgs, colorMap, spec1.whiteSquare)
		finalSpecs.append(spec)
		#print 'spectrum ' + str(i + 1) + '/' + str(l) + ' created'
	return finalSpecs
	
#GIVEN A LIST OF SPECTRUMS FORMING A GRADIENT (OUTPUT OF MAKE2DSPECTRUM()), SAVES AN IMAGE REPRESENTING THE GRADIENT OF SPECTRUMS
def disp2d(specList):
	img = Image.new('RGB', (2*64*len(specList[0].colors), 64*len(specList)), 'white')
	for s in range(0, len(specList)):
		for i in range(0, len(specList[s].colors)):
			emo = Image.open(specList[s].lilImgDir + specList[s].imgs[i].name)
			img.paste(emo, (64*len(specList[0].colors) + i*64, 64*s))
			colBox = Image.new('RGB', (64,64), specList[s].colors[i])
			img.paste(colBox, (i * 64, s * 64))
	img.save('double_spectrum.png')
	print 'double spectrum saved as "double_spectrum.png'

