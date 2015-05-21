#!/usr/bin/python

import os
import json
import random
import movieMaker

# RANDOMIZES EMOJI SELECTIONS AND SAVES THEM IN DIRS BY NAMES 'RANDOMDIRS/<HEX NUMBER>/', RETURNS A LIST OF PATHS TO NEW RANDOMDIRS
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
			if newRanImg == 'white.png':
				continue
			if newRanImg in usedImgs:
				continue
			else:
				usedImgs[newRanImg] = True
				os.system('cp ' + lilImgDir + newRanImg + ' randomdirs/' + newDirName + newRanImg)
				totImgsSoFar += 1
	return [ 'randomdirs/' + name for name in os.listdir('randomdirs/') ]

#TODO this function writes an instructions file from a writerFile
def writeInsFile(writerFile, insFile):
	#TODO
	totDirSegments = 150 
	totSeconds = 150 #2min
	totFrames = totSeconds * 30
	framesPerSeg = totFrames / totDirSegments
	inputVideo = 'gifs'
	smallGran = 500
	bigGran = 500
	randomDirs = makeRandomLilImgDirs('emoji/', totDirSegments, 1)
	f = open(insFile, 'w')	
	f.write('Sequence s (mos) 0\n')
	for i in range(totDirSegments):
		f.write('\t' + inputVideo + ' ' + randomDirs[i] + '/\n')
		f.write('\t\t' + str(framesPerSeg) + '\t1\t' + str(smallGran))
		if bigGran == smallGran:
			f.write('\n')
		else:
			f.write('\t' + str(bigGran) + '\n')
	f.write('endSeq\n\n')
	f.write('makeAnim\n')
	f.write('s\n')
	f.write('endAnim')
