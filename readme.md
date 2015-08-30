This is a Python-based command line photo-mosaic mp4 re-animator and image synthesizer with several features and options for image modification and performance optimization. It utilizes PIL's Image module, the ImageDraw module, the multiprocessing module, ImageMagick, and ffmpeg for procedural image/frame modification, pixel-by-pixel RGB-value analysis, RGB-value averaging, color compression, RGB-value distance analysis, image segment replacement, 1D and 2D gradient creation, image synthesis parallelization, and HD mp4 video compression. This read-me will cover the current command line options, how they work, and measures that were taken to make them run faster. This project is a work in progress so this read-me may not be entirely up-to-date all the time, but hopefully this should help people to start to understand how this code works. Also, the code itself is generally pretty well commented, and I would encourage anyone interested in the programming side of this project to check out my actual Python source files in this repository 

Usage:
======

Making a photo-mosaic video:
===========================

" $ python remoji.py -v -p mov/ ins/test.txt 0 10"

Use this command to make a photo-mosaic video, where the output frames are saved as mov/anim0001.png, mov/anim0002.png, etc... This command uses the supplied input video from second 0, to second 10, and the instructions file ins/test.txt, which should read something like this (all tabs, no spaces):

    Sequence s1 (mos) 0			# Make Sequence class of "mosaic" type named "s1." starts at frame 0 from input video segment (which is 0-10s as declared in the command line args)
        gifs emoji/			# Use input video mp4s/gifs.MP4 for next 150 frames. Use the directory of images "emoji/" for the icon set to use for the photo-mosaic video over these frames.
                150     1       120	#These 150 frames move at a speed of 1 frame / input video frame, and the icon width throughout this segment is ~120px
	gifs win/			# For the next 150 frames of the input video, use the image directory "win/" instead of emoji
		150	1	80	5	#Again use speed of 1 frame / input video frame, but this time start at an icon width of ~80px, and gradually shrink to an icon width of ~5px through the 150 frames
endSeq

Sequence s2 (spec) emoji/ 0				#Make Sequence class of "spectrum" type, use directory "emoji/" for whole sequence
        (0, 0, 0) (255, 0, 255) 15			# These 150 frames use the input video "mp4s/stripes.MP4, start with a color-limited gradient of emojis between (0,0,0) (255,0,255) with 15 steps inbetween the two colors, and through at the 150 frames, gradually changes the available color gradient to (0,0,0) (0,255,255). A gradient of gradients, if you will.
                stripes
                        150     1       120     5
        (0, 0, 0) (0, 255, 255) 15
		stripes
			150	1	5
        (0, 0, 0) (0, 0, 255) 15
endSeq

makeAnim #Make the final animation, combine s1 followed by s2 for the final output
s1
s2
endAnim

After this command finishes, use this ffmpeg command to compress the output frames into a video:
"$ ffmpeg -r 30 -i mov/anim%04d.png -vb 20000k -c:v libx264 -pix_fmt yuv420p movie.mp4"

Make a single photo-mosaic image:
=================================

	This option takes a starting image, a directory name followed by "/", a name to output the image to, a scale, and a depth (tile resolution in pixels) to create a single photo-mosaic image from the image library specified by <little image directory>. For instance, the command: 

" $ python remoji.py -s emoji/1f42a.png emoji/ camel.png 10 40" 

Would make a photo-mosaic of the image at the path "emoji/1f42a.png" using the images in the directory "emoji/", and save it as "camel.png" in the current directory. Also, the final image will be ten times the size, and comprised of miniature images that are forty pixels wide. This is accomplished by first calculating the average RGB-value of every image in the "emoji/" directory. The program saves this this information in a list of ImageInfo objects called littleImgs, a light-weight class I defined for holding an image's name, dimensions, and average RGB-value. When an ImageInfo object is initialized, it calls getAvgRGB() on the image that was used to initialize it. GetAvgRGB() calculates the average RGB-value of the entire image, and therefore must access every pixel of the image that it's called on. So, while storing an ImageInfo object is inexpensive, initializing one can be CPU-heavy for a large image. Then, the program cuts the image "emoji/1f42a.png" into tiles that are 40x40 pixels large, calculating the average RGB-value of each tile. Then, it calculates which image in littleImg's average RGB-value vector has the shortest distance to the average RGB-value of each tile, and creates a new image, placing images from littleImgs onto it with the correct locations and scales. Most of the heavy lifting is done by the makeMosaic() method, which calls a wide range of methods. 

Remove transparent pixels in little image directory:
====================================================
 	"python remoji.py -c win/"
	 
	This option takes the little image directory, and re-saves all the images after converting their transparent pixels to solid white. This prevents PIL from occasionally converting transparent pixels to black, which can interfere with output image quality in some circumstances. So, running "$ python remoji.py -c emoji/" will over-write "emoji/" with images containing no transparent pixels, but white pixels in their place. 

Join directories of output frames: 
==================================
	"$ python remoji.py -j mov1/ mov2/ mov3/ movf/

	The -j (join) option concatenates all the frames in order from the directories passed as arguments up until the last argument. The new, concatenated directory is saved at the directory pass as the last argument (output movie directory). This option allows the user to render just chunks of an animation at a time, then add the new changes to an existing video.
