// Runs last on every frame: places the words, labels and the pixel wipe; clears the 3D drawing when no beat drew it.
KIT.shot({ id: 'post', t0: 0, t1: 9999, update(t) { VOX.frame(t); ANAT.end(); } });
