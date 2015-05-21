#!/usr/bin/python

import os
import json
import random
import movieMaker

# RANDOMIZES EMOJI SELECTIONS AND SAVES THEM IN DIRS BY NAMES 'RANDOMDIRS/<HEX NUMBER>/'
def makeRandomLilImgDirs(lilImgDir, totDirs, leastTotImgs, mostTotImgs = None):
	movieMaker.wipeDir('randomdirs/')
	littleImgNames = os.listdir(lilImgDir)
	if mostTotImgs == None:
		mostTotImgs = leastTotImgs
	for i in range(totDirs):
		newDirName = 'r' + str(i) + '/'
		os.system('mkdir randomdirs/' + newDirName)
		totRanImgs = random.choice(range(leastTotImgs, mostTotImgs + 1))
		totImgsSoFar = 0
		usedImgs = {} # { <IMGNAME> : TRUE ... }
		while totImgsSoFar < totRanImgs:
			newRanImg = random.choice(littleImgNames)
			if newRanImg in usedImgs:
				continue
			else:
				usedImgs[newRanImg] = True
				os.system('cp ' + lilImgDir + newRanImg + ' randomdirs/' + newDirName + newRanImg)
				totImgsSoFar += 1

#TODO this function writes an instructions file from a writerFile
#def writeInsFile(writerFile, insFile):
#	#TODO
#	totDirSegments = 120 
#	totSeconds = 120
#	totFrames = totSeconds * 3
#	framesPerDirSegment = totFrames / totDirSegments
#	makeRandomLilImgDirs('emoji/', 20, 3)
