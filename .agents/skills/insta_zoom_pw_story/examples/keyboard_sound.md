# Example: "AI hears your password", in our words

The reference reel's topic, written again with Ali's house rules: his face on the claim, his pace, 5th-grade words,
no gate at the end. 250 words, about 96 s at 2.6 words a second. Facts are from the paper (see
[../references/reference-reel.md](../references/reference-reel.md)).

Check it: `python3 .agents/skills/insta_zoom_pw_story/scripts/check_story.py .agents/skills/insta_zoom_pw_story/examples/keyboard_sound.md`

| Beat | Script | Action |
|---|---|---|
| claim | Somebody on your next video call could work out your password. All they need is the sound of your keys. | Ali on camera, to the lens. On "password" a laptop slides in beside him: a video call, and a password field that fills in one letter for every key sound. |
| proof | Researchers at three British universities tried it. With a phone next to a laptop, an AI got 95 out of 100 keys right. | Whip to a phone lying next to the laptop. Its screen guesses each letter with a percent. The first page of the paper sits beside it, and a number counts up to 95. |
| promise | Here is how it works, and how you would build one. | Whip back to the keyboard and dive into the E key. The key becomes a drawn outline on the board. |
| anchor | You already know AI can look at a photo and tell what is in it. | A drawn photo. Boxes land on a face and a tree, an arrow goes into a box marked AI, and out come FACE and TREE with a tick each. |
| question | But how can it tell the E key from the R key with sound alone? | The photo wipes away. An orange E key and a blue R key, a small wave under each, a question mark between them. |
| step | Every key press makes a tiny click, and a mic saves it as a wave. | Only the orange E key. The words ONE CLICK. Its wave draws itself from left to right. |
| step | Next, you cut that wave into very thin slices. | Thin lines cut the wave. One slice turns yellow. |
| step | In every slice, you measure how much low sound and how much high sound there is. | The wave shrinks to the top and stays there. The yellow slice opens into bars from LOW to HIGH, then the bars turn into one column of colour cells. |
| step | Then you stand the slices next to each other. | More columns slide in beside the first one until they touch. |
| name | Now the click is a picture. It is called a spectrogram. | The columns join into one block. A frame draws around it and the word SPECTROGRAM writes itself above. |
| read | Left to right is time. Bottom to top is low to high. Brighter means louder. | Three arrows draw, each on its own sentence: TIME, LOW to HIGH, QUIET to LOUD. |
| why | The E key and the R key sit in different spots. So each one shakes the laptop in its own way and leaves its own stripes. | Two whole laptops side by side: the E key lit orange, the R key lit blue, ripples spreading from each. Under them, two pictures with different stripes. |
| recipe | So you press every key 25 times and turn each click into a picture. Then you train a free image AI to match each picture to its key. | Two grids fill with 25 small pictures each. Arrows go into a box marked IMAGE AI. A new click goes in and the E lights up with a tick. |
| catch | Here is the catch. It only works this well on the keyboard it learned from. | A green keyboard with a tick. A second keyboard draws beside it and gets a question mark. |
| close | So never type a password on a call. Send this to the friend who does. The build steps are in the description. | Pull out of the board and land back on Ali on camera. |

## Description (adds what the video skipped)

The test was done on a MacBook Pro with an iPhone 13 mini lying 17 cm away. Over a Zoom call, using the laptop's own
mic, the AI still got 93 out of 100 keys right.

Build it on your own keyboard:

1. Record yourself pressing each key 25 times. The team did 36 keys: a to z and 0 to 9.
2. Cut the recording into single clicks.
3. Turn each click into a mel-spectrogram, a small 64 x 64 picture.
4. Train an image model on the pictures. The team used one called CoAtNet.
5. Test it on new presses.

Paper: "A Practical Deep Learning-Based Acoustic Side Channel Attack on Keyboards" (Harrison, Toreini, Mehrnezhad,
2023), arxiv.org/abs/2308.01074
