# ANANSI REST API

## What is ANANSI

ANANSI is a hexapod designed for search and rescue operations powered by the ST-Discovery-L475E-IOT01A designed and presented for [AICTE Inventor's Challenge](https://community.arm.com/the-inventors-challenge-2024).

## What is this code?

Yet Another Express REST API. Man at this point I might as well just contribute to Express.js with how much I use their library, it is honestly my favorite micro HTTP framework (if you ignore the 13TB node_modules bloat).  

Anyway, this particular one talks to a ST-Discovery-L475E-IOT01A which has sensors on board like a temperature sensor, pressure sensor, gas sensor, etc.  

Uses TCP wireless-ly over WiFI Why? - because in the future (*lol sure buddy*) we plan to expand range via MODBUS and RS485 over wired communication and TCP is the base in both cases.  

The REST API is actually to interface with the [electron client](https://github.com/ShanTen/ANANSI-Electron-Client).  

To interface with the MCU, we use TCP sockets and reply with "PONGs" to the TCP "PINGs" of the MCU which occur every 10-500ms (depends on the setting in the MCU). 

At the same time, we get movement data from the electron client which is stored in a queue (movement/instruction queue) and served whenever the microcontroller polls with the socket BOOM!

Now, you might be thinking the following...

> "Why did you do this shantanu?" 
> "Isn't it just easier to...you know program a TCP server on the MCU?" 
> "You're just bad at programming" 
> "Skill issue"
> "Maybe if you stopped using JS and used a real programming language like C++ your parents would actually love you"


HEY LOOK ALL OF THAT IS VALID EXCEPT THE LAST ONE, MY PARENTS LOVE ME REGARDLESS OF THE BAD CODE I WRITE 😤😤😤 (I believe loving me is their job.)

Look man, I tried, I really really freaking tried, but the freaking documentation for Mbed OS 6 is non existent, they straight up don't have documentation on the TCP server and the only HTTP server example I found was a random 2 year old post from a Slovenian induvidual on the Mbed forums fighting stage 3 lymphoma (I hope you're doing well bro).  

Besides the platform is being phased out 2024, so why would they bother? I saw that the ping-pong solution worked, and it worked pretty damn reliably without complicated creating my own HTTP server in C++ with just sockets so you know damn well I used it.  

Thus the code is reliable and robust, perfect and most importantly IT IS MY CODE SO BOO HOO COPE BOZO.

Anyway, here's a graphical representation of the telemetry to all my ADHD bros out, there...represent ✌

## Telemetry Overview 

![](/images/telemetry_overview.png)