#!/usr/bin/python

import os
import time
import movieMaker
import remoji
from multiprocessing import Process, Pool
from collections import deque
import re
import spectrum
import pickle

mp4Bool = True

class Sequence:
	def __init__(self, name):
		self.name = name
		self.framePaths = []

class GifInfo:
	def __init__(self, name, mp4Bool, secondsRange):
		self.name = name
		self.framesDir = name + 'frames/'
		#print os.listdir('.')
		if mp4Bool == False:
			self.totFrames = remoji.convertGif(name, self.framesDir, auto = True)
		else:
			if self.framesDir[:-1] in os.listdir('.'):
				print 'found ' + self.framesDir + ', not wiping'
				self.totFrames = remoji.convertMp4(name, self.framesDir, secondsRange, auto = True)
			else:
				movieMaker.wipeDir(self.framesDir)
				print 'wiping ' + self.framesDir
				self.totFrames = remoji.convertMp4(name, self.framesDir, secondsRange, auto = False)
			print 'totFrames getting created here'
			print 'secondsRange = ' + str(secondsRange)
			print 'totFrames = '  + str(self.totFrames)
			

def compressColor(color):
	newColor = (color[0] / 4 * 4, color[1] / 4 * 4, color[2] / 4 * 4) 
	return newColor

# MAKES A MAP OF EVERY POSSIBLE COLOR
def buildColorMap(lilImgDir, mapFile):
	st = time.time()
	colorMap = {}
	lilImgs = remoji.getLittleImgs(lilImgDir)
	os.system('rm '+ mapFile) 
	f = open(mapFile, 'w+')
	i = 0
	for r in range(0, 64):
		for g in range(0, 64):
			for b in range(0, 64):
				closestImg = remoji.getClosestImg((r*4, g*4, b*4), lilImgs, colorMap, lilImgDir, oneColor = True)
				i += 1
		print i / float(262144)
		nt = time.time()
		print str(nt - st), 'seconds'
	pickle.dump(colorMap, f)

#THIS FUNCTION LOADS AND RETURNS A COLOR MAP FROM A PREVIOUSLY WRITTEN TEXT FILE
def loadMapFile(mapFile):
	f = open(mapFile)
	colorMap = pickle.load(f)
	return colorMap

#THIS FUNCTION TAKES A LINE, AND SPLITS IT UP INTO WORDS BY WHITE SPACE
def getWords(line):
	lineWords = re.split('\s+', line)
	#print lineWords
	while lineWords[-1] is '':
		lineWords.pop()
		if len(lineWords) == 0:
			return None
	while lineWords[0] is '':
		lineWords.pop(0)
		if len(lineWords) == 0:
			return None
	return lineWords

def getNums(line):
	lineNums = re.split('\D+', line)
	while lineNums[-1] is '':
		lineNums.pop()
		if len(lineNums) == 0:
			return None
	while lineNums[0] is '':
		lineNums.pop(0)
		if len(lineNums) == 0:
			return None
	lineNums = [ int(x) for x in lineNums]
	return lineNums

#THIS FUNCTION POPULATES FRAMEMAP GIVEN INSTRUCTIONS FOR A GIVE SEQUENCE SUPPLIED IN THE LIST ANIMS
#ANIMS IN THE FORMAT: anim = (gifName, lilImgDir, FRAMES, SPEED, SRES, ERES (OPTIONAL))
#THIS FUNCTION ALSO BUILDS THE GIVEN SEQUENCE'S FRAMEPATHS LIST
def getMosFrames(anims, colorMap, gifMap, frameMap, movDir, outputName, seq, dbFrame, loopFrame, specDirOrder = None, secondsRange = (0, 60)):
	j = loopFrame
	for anim in anims:
		if len(anim) is 6:
			[gifName, lilImgDir, frames, speed, sRes, eRes] = anim
		if len(anim) is 5:
			[gifName, lilImgDir, frames, speed, sRes] = anim
			eRes = sRes
		frames = int(frames)
		speed = int(speed)
		sRes = int(sRes)
		eRes = int(eRes)
		framesPerGif = None
		if gifName in gifMap:
			if mp4Bool == False:
				framesPerGif = gifMap[gifName].totFrames
			else:
				framesPerGif = (secondsRange[1] - secondsRange[0]) * 30
			print 'framesPerGif:i',framesPerGif
		else:
			gifInfo = GifInfo(gifName, mp4Bool, secondsRange)
			gifMap[gifName] = gifInfo
			print 'mp4Bool: ' + str(mp4Bool)
			if mp4Bool == False:
				framesPerGif = gifInfo.totFrames
			else:
				framesPerGif = (secondsRange[1] - secondsRange[0]) * 30
		approxRes = sRes
		approxStep = (eRes - sRes) / (float(frames * speed))
		if specDirOrder != None:
			newAnims = []
			curAnimCounter = 0
			for i in range(0, int(frames)):
				curRes = int(round(approxRes))
				curAnim = anims[curAnimCounter]
				curSpecDir = specDirOrder.pop(0)
				newAnims.append([gifName, curSpecDir, 1, speed, approxRes])
				approxRes += approxStep
					
			# Recursive call to getMosFrames with each anim from newAnims
			[dbFrame, loopFrame] = getMosFrames(newAnims, colorMap, gifMap, frameMap, movDir, outputName, seq, dbFrame, loopFrame, secondsRange = secondsRange)
########
		else:
			for i in range(0, int(frames)):
				for s in range(0, int(speed)):
					curRes = int(round(approxRes))
					dbFrameStr = movieMaker.getFrameStr(dbFrame, 4)
					frameDesc = (gifName, lilImgDir, j % framesPerGif, curRes)
					if frameDesc in frameMap:
						seq.framePaths.append(frameMap[frameDesc])
					else:
						frameMap[frameDesc] = 'unique/' + outputName + dbFrameStr + '.png'
						seq.framePaths.append(frameMap[frameDesc])
						dbFrame += 1
					approxRes += approxStep
				j += 1
	loopFrame = j
	return [dbFrame, loopFrame]

#THIS FUNCTION IS CALLED WHEN READFILE IS READING A SEQUENCE WITH THE 'SPEC' OPTION. IT USES THE ANIMS STARTING WITH NUMBERS TO CALCULATE THE 2D GRADIENTS AND THE RATE AT WHICH THE COLOR PALETTE CHANGES. THEN IT MAKES TEMPORARY DIRECTORIES FOR IMAGES CONTAINED IN SPECTRUMS, AND THESE DIRECTORIES ARE ASSIGNED TO EACH ANIM LINES 'LILIMGDIR' SLOT ACCORDINGLY. THIS FUNCTION ALSO HELPS BUILD SPECMAP
def modifySpecAnims(anims, colorMap, whiteSquare, lilImgDBDir = 'emoji/'):
	littleImgs = remoji.getLittleImgs(lilImgDBDir)
	newAnims = []
	i = 0
	j = 0 #Runner
	curSpec = None
	specDirOrder = [] #DIRECTORY NAMES IN ORDER CORRESPONDING 1:1 TO FRAMES IN THE ANIMATION
	while i < len(anims):
		if curSpec == None:
			pivotColors = []
			steps = anims[i].pop()
			for p in range(0, len(anims[i]) / 3):
				r = int(anims[i].pop(0))
				g = int(anims[i].pop(0))
				b = int(anims[i].pop(0))
				tempPivotColor = []
				tempPivotColor.append(r)
				tempPivotColor.append(g)
				tempPivotColor.append(b)
				pivotColors.append(tempPivotColor)
			curSpec = spectrum.Spectrum(steps, pivotColors, lilImgDBDir, littleImgs, colorMap, whiteSquare)
		j = i + 1
			#JUMP TO NEXT SPECTRUM
		while type(anims[j][0]) != int:
			j += 1
		steps = int(anims[j].pop())
		pivotColors = []
		for p in range(0, len(anims[j]) / 3):
			r = int(anims[j].pop(0))
			g = int(anims[j].pop(0))
			b = int(anims[j].pop(0))
			tempPivotColor = []
			tempPivotColor.append(r)
			tempPivotColor.append(g)
			tempPivotColor.append(b)
			pivotColors.append(tempPivotColor)
		nextSpec = spectrum.Spectrum(steps, pivotColors, lilImgDBDir, littleImgs, colorMap, whiteSquare)
		spec2d = spectrum.make2dSpectrum(20, curSpec, nextSpec, lilImgDBDir, littleImgs, colorMap)
		transitionFrames = 0
		tempNonSpecAnims = []
		#COUNT TOTAL TRANSITION FRAMES IN THIS LOOP
		while i < (j - 1):
			i += 1
			newAnims.append(anims[i])
			tempNonSpecAnims.append(anims[i])
			moreFrames = int(anims[i][2])
			transitionFrames += moreFrames
		i = j
		totSpectrums = len(spec2d) - 1 # -1 so that last spectrum doesnt get re-used in next anim 
		floatStep = totSpectrums / float(transitionFrames)
		specDirShortOrder = []
		for frame in range(0, transitionFrames):
			approxStep = floatStep * frame
			roundStep = int(round(approxStep))
			spec = spec2d[roundStep]
			dirName = spec.namify()
			specDirShortOrder.append(dirName)
			#IF THERES A PATH TO SPEC/DIRNAME, DONT BOTHER, ELSE, MAKE IT
			movieMaker.wipeDir('spec/' + dirName)
			spec.copyImgsToDir('spec/' + dirName)
			specDirOrder.append('spec/' + dirName)
		if j == (len(anims) - 1):
			break
		curSpec = nextSpec
	return [newAnims, specDirOrder]


def readFile(instructionsFile, movDir, outputName, colorMap = {}, mp4Bool = False, secondsRange = (0, 60)):
	movieMaker.wipeDir('unique/')
	frameMap = {}
	specMap = {}	# { (PIVOTCOLORS, LEVELSPERPIVOTCOLOR, LILIMGDIR) : SPECTRUMDIR }
#	colorMap = {} 	# { (COLOR TUPLE, LILIMGDIR) : LILIMGPATH }	
	definedSequences = {}
	lilImgMap = {}
	gifMap = {}
	seqOrder = []
	dbFrame = 1
	f = open(instructionsFile)
	frame = 1
	lines = f.readlines()
	curLine = 0
	#EVENTUALLY CHANGE THIS TO ROLLING I VALUE
	while curLine < len(lines):
		lineWords = getWords(lines[curLine])
		if lineWords is None:
			curLine += 1
			continue
		if '#' in lineWords[0]:
			curLine += 1
			continue
		if lineWords[0] == 'Sequence':
			seqLines = []
			seqName = lineWords[1]
			seqType = lineWords[2][1:-1]
			seq = Sequence(seqName)
			#SPECTRUM MODE LINE PARSING
			if seqType == 'spec':
				lilImgDir = ''
				baseDir = lineWords[3]
				loopFrame = int(lineWords[4])
				whiteSquare = False
				if baseDir[-1] == 'w':
					baseDir = baseDir[:-1]
					whiteSquare = True
				anims = []
				j = curLine + 1
				while getWords(lines[j])[0] != 'endSeq':
					seqLines.append(lines[j])
					if '#' in lines[j]:
						curLine += 1
						continue
					j += 1
				seqLines.append(lines[j])
				curSeqLine = 0
				while curSeqLine < len(seqLines):
					s = re.search('^\t{1}\S', seqLines[curSeqLine])
					try:
						match = s.group(0)
					except:
						s = re.search('^\t{2}\S', seqLines[curSeqLine])
						try:
							match = s.group(0)
						except:
							s = re.search('^\t{3}\S', seqLines[curSeqLine])
							try:
								match = s.group(0)
								seqLineWords = getWords(seqLines[curSeqLine])
								if len(seqLineWords) is 4:
									anim = [gifName, lilImgDir, seqLineWords[0], seqLineWords[1], seqLineWords[2], seqLineWords[3]]
									anims.append(anim)
								if len(seqLineWords) is 3:
									anim = [gifName, lilImgDir, seqLineWords[0], seqLineWords[1], seqLineWords[2]]
									anims.append(anim)
							except:
								curSeqLine += 1
								continue
							curSeqLine += 1
							continue 
						gifName = getWords(seqLines[curSeqLine])[0]
						curSeqLine += 1
						continue
					spectrumNums = getNums(seqLines[curSeqLine])
					anims.append(spectrumNums)
					
					curSeqLine += 1
				print 'anims:', anims
				(anims, specDirOrder) = modifySpecAnims(anims, colorMap, whiteSquare, baseDir)
				[dbFrame, loopFrame] = getMosFrames(anims, colorMap, gifMap, frameMap, movDir, outputName, seq, dbFrame, loopFrame, specDirOrder, secondsRange = secondsRange)


			#MOSAIC MODE LINE PARSING
			if seqType == 'mos':
				#ANIMS DESCRIBE SEGMENTS OF THE SEQUENCE
				loopFrame = int(lineWords[3])
				anims = []
				j = curLine + 1
				while getWords(lines[j])[0] != 'endSeq':
					seqLines.append(lines[j])
					if '#' in lines[j]:
						curLine += 1
						continue
					j += 1
				seqLines.append(lines[j]) 
				curSeqLine = 0
				while curSeqLine < len(seqLines):
					#MATCH SINGLE TABBED LINE
					s = re.search('^\t{1}\S', seqLines[curSeqLine])
					try:
						match = s.group(0)
					except:
						#MATCH DOUBLE TABBED LINE
						s = re.search('^\t{2}\S', seqLines[curSeqLine])
						try:
							match = s.group(0)
							seqLineWords = getWords(seqLines[curSeqLine])
							if len(seqLineWords) is 4:
								anim = (gifName, lilImgDir, seqLineWords[0], seqLineWords[1], seqLineWords[2], seqLineWords[3])
								anims.append(anim)
							if len(seqLineWords) is 3:
								anim = (gifName, lilImgDir, seqLineWords[0], seqLineWords[1], seqLineWords[2])
								anims.append(anim)
						except:
							curSeqLine += 1
							continue
						curSeqLine += 1
						continue
					seqLineWords = getWords(seqLines[curSeqLine])
					(gifName, lilImgDir) = (seqLineWords[0], seqLineWords[1])
					print gifName, lilImgDir
					curSeqLine += 1
				[dbFrame, loopFrame] = getMosFrames(anims, colorMap, gifMap, frameMap, movDir, outputName, seq, dbFrame, loopFrame, secondsRange = secondsRange)
			definedSequences[seq.name] = seq
		if lineWords[0] == 'makeAnim':
			j = curLine + 1
			while getWords(lines[j])[0] != 'endAnim':	
				if '#' in lines[j]:
					curLine += 1
					continue
				seqOrder.append(getWords(lines[j])[0])
				j += 1
			frame = 1
			pool = Pool(processes = 4)
			inputFrameNames = []
			print 'making mosaics for ' + str(len(frameMap)) + ' unique frames...'
			for key in frameMap:
				(gifName, lilImgDir, loopFrame, curRes) = key
				if gifName not in gifMap:
					gifInfo = GifInfo(gifName, mp4Bool, secondsRange)
					print 'new gifInfo class'
					gifMap[gifName] = gifInfo
				if lilImgDir not in lilImgMap:
					littleImgs = remoji.getLittleImgs(lilImgDir)
					lilImgMap[lilImgDir] = littleImgs
				else:
					littleImgs = lilImgMap[lilImgDir]
			for key in frameMap:
				(gifName, lilImgDir, loopFrame, curRes) = key
				inputFrameNames = os.listdir(gifMap[gifName].framesDir)
				inputFrameNames.sort()
				depthPix = curRes + 6
				pool.apply_async(remoji.makeMosaic, [gifMap[gifName].framesDir + inputFrameNames[loopFrame], 'autoScale', depthPix, lilImgMap[lilImgDir], frameMap[key], colorMap, lilImgDir])
			pool.close()
			pool.join()

			movieMaker.wipeDir(movDir)
			for seqName in seqOrder:
				seq = definedSequences[seqName]
				for framePath in seq.framePaths:
					frameStr = movieMaker.getFrameStr(frame, 4)
					os.system('cp ' + framePath + ' ' + movDir + outputName + frameStr + '.png')
					frame += 1
			break
		curLine += 1
