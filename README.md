# Pwnagetty

![pwnagetty](https://i.imgur.com/Cs5yqMI.jpg)


Pwnagetty is a cli application written in NodeJS, to streamline the process of downloading handshakes from your Pwnagotchi, verify each PCAP file and convert them to the approiate format (EAPOL or PMKID) ready for Hashcat cracking. All while keeping a log of converted files and BSSID's to illiminate duplicates in the future. 

## Requirements

Pwnagetty relies on the below. Make sure you have these installed *before* installing Pwnagetty.

[NODEJS](https://nodejs.org/en/) - (Built with NodeJS)

[HCXPCAPTOOL](https://github.com/ZerBea/hcxtools) - (To verify and convert PCAP's)

[AIRCRACK-NG](https://www.aircrack-ng.org/) - (To extract BSSID's from PCAP's)

## Installation

Choose a directory you'd like to save this in then run the below.

```
git clone https://github.com/CyrisXD/Pwnagetty.git
cd Pwnagetty
npm install
sudo npm install -g

```
Edit the config to add your details inside of Pwnagetty/bin/index.js
You'll likely only need to change the username, password and handshakeDir.
```
//====================================
// SFTP Configuration - CHANGE THESE
//====================================
const config = {
    host: "10.0.0.2", // Set your Pwnagotchi IP
    username: "pi", // Set your SSH username
    password: "raspberry", // Set your SSH password
    handshakeDir: "/home/pi/handshakes/", // Set your handshake directory on the Pwnagotchi
    port: 22,
    localDir: "./pcap/",
    database: path.join(__dirname, "./db.json"),
};
```

## Usage
Connect your Pwnagotchi to your computer and wait for it to boot.
Navigate to an empty local directory in terminal and just run:
``` 
pwnagetty
```

Pwnagetty will then SFTP into your Pwnagotchi, create 3 local folders in your empty directory and do it's job.

## Disclaimer
This was built for educational purposes. (I had fun learning about await/async). It goes without saying, **do not use this tool against or with networks you do not have permission for. I am not liable for your actions.**

