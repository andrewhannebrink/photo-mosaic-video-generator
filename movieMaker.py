#!/usr/bin/python

import os
import sys
import getopt
import subprocess
import re
from PIL import Image

#CONVERTS A FRAME NUMBER INTO A STRING WITH THE APPROPRIATE NUMBER OF ZEROES BEFOREHAND GIVEN THE PARAMETER 'DIGITS'
def getFrameStr(frame, digits):
	if digits is 4:
		if len(str(frame)) is 1:
			frameStr = '000' + str(frame)
		if len(str(frame)) is 2:
			frameStr = '00' + str(frame)
		if len(str(frame)) is 3:
			frameStr = '0' + str(frame)
		if len(str(frame)) is 4:
			frameStr = str(frame)
	if digits is 3:
		if len(str(frame)) is 1:
			frameStr = '00' + str(frame)
		if len(str(frame)) is 2:
			frameStr = '0' + str(frame)
		if len(str(frame)) is 3:
			frameStr = str(frame)
	if digits is 2:
		if len(str(frame)) is 1:
			frameStr = '0' + str(frame)
		if len(str(frame)) is 2:
			frameStr = str(frame)
	return frameStr

# CONCATENATES ALL THE FRAME SEQUENCES IN ORDER FROM THE DIRECTORIES IN MOVDIRLIST, AND SAVES THE NEW FRAME SEQUENCE TO OPMOVDIR
def joinMovDirs(movDirList, opMovDir):
	wipeDir(opMovDir)	
	i = 1
	for movDir in movDirList:
		frames = os.listdir(movDir)
		frames.sort()
		for frame in frames:
			newName = 'anim' + getFrameStr(i, 4) + '.png'
			os.system('cp ' + movDir + frame + ' ' + opMovDir + newName)
			i += 1
		
#THIS CLASS KEEPS TRACK OF FRAME INFORMATION AFTER TRANSITIONING ANIMATIONS
class TransInfo:
	def __init__(self, dbDir, res, loopFrame, frame):
		self.dbDir = dbDir
		self.res = res
		self.loopFrame = loopFrame
		self.frame = frame

#THIS FUNCTION CLEANS THE PASSED DIRECTORY SO THAT NO FILES ARE LEFT OVER FROM OLDER TRIALS. THE IDEA HERE IS TO RUN THIS AT THE BEGINNING OF THE MAIN FUNCTION ONCE PER RUN
def wipeDir(directory):
	os.system('rm -rf ' + directory)
	os.system('mkdir ' + directory)

# THIS FUNCTION RETURNS THE NUMBER OF FRAMES IN THE SUPPLIED GIF
def getTotFrames(inputGifName):
        cmd = 'convert ' + inputGifName + '.gif -format "%n" info: | tail -n 1'
        print cmd 
        totFrames = int(subprocess.check_output(cmd, shell = True))
        return totFrames

#BASIC BOX TRANSITION, NOTE THAT THE FINAL AMOUNT OF FRAMES IN THE TRANSITION WILL BE FRAMEPERTRANS + (FRAMEPERRES(DBDIR2) % FRAMEPERTRANS). ALSO NOTE THAT THIS FUNCTION RELIES ON THERE BEING A 1920 X 1080 ANIMATION DIMENSION.
def boxTrans(dbDir1, dbDir2, outputName, movDir, framePerTrans, loopFrame, frame, speed, startRes1, startRes2, endRes1 = None, endRes2 = None):
	origFrames1 = os.listdir(dbDir1)
	origFrames2 = os.listdir(dbDir2)
	origFrames1.sort()
	origFrames2.sort()
	framePerRes1 = len(origFrames1) / 20
	framePerRes2 = len(origFrames2) / 20
	approxXStepPix = 1920 / float(framePerTrans)
	approxYStepPix = 1080 / float(framePerTrans)
	j = loopFrame   #HELPS KEEP TRACK OF FRAMES TO FINISH LOOP AT THE END
	for i in range(0, framePerTrans):
		[bx, by] = [round(approxXStepPix * i), round(approxYStepPix * i)]
		xBuf = int((1920 - bx) / 2)
		yBuf = int((1080 - by) / 2)
		newImg = Image.open(dbDir1 + origFrames1[(startRes1 * framePerRes1) + (j % framePerRes1)])
		img2 = Image.open(dbDir2 + origFrames2[(startRes2 * framePerRes2) + (j % framePerRes2)])
		box = img2.crop((xBuf, yBuf, 1279 - xBuf, 719 - yBuf))
		newImg.paste(box, (xBuf, yBuf))	
		newImg.save(movDir + outputName + getFrameStr(frame, 4) + '.png')
		j += 1
		frame += 1
	loopFrame = j % framePerRes2
	if endRes2 is None:
		res = startRes2
	else:
		res = endRes2
	transInfo = TransInfo(dbDir2, res, loopFrame, frame)
	return transInfo
#	while (j % framePerRes2) is not 0:
#		os.system('cp ' + dbDir2 + origFrames2[(startRes2 * framePerRes2) + (j % framePerRes2)] + ' ' + movDir + outputName + getFrameStr(frame, 4) + '.png')
#		j+=1
#		frame += 1
		
#TAKES FRAMES IN 'DIRECTORY' AND MAKES AN MPEG ANIMATION OF THEM
def framesToMpg(outputName, directory):
	newFrames = os.listdir(directory)
	os.system('ffmpeg -r 20 -i ' + directory + outputName + '%04d.png -vb 80M -vcodec mpeg4 mpg/' + outputName + '.mp4')	
