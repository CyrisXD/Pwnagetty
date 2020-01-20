#!/usr/bin/env node
const path = require('path')
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');
const { exec } = require('child_process');

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


//=======================
// Console log the logo
//=======================
logo = () => {
    console.log(`

    ██████╗ ██╗    ██╗███╗   ██╗ █████╗  ██████╗ ███████╗████████╗████████╗██╗   ██╗
    ██╔══██╗██║    ██║████╗  ██║██╔══██╗██╔════╝ ██╔════╝╚══██╔══╝╚══██╔══╝╚██╗ ██╔╝
    ██████╔╝██║ █╗ ██║██╔██╗ ██║███████║██║  ███╗█████╗     ██║      ██║    ╚████╔╝ 
    ██╔═══╝ ██║███╗██║██║╚██╗██║██╔══██║██║   ██║██╔══╝     ██║      ██║     ╚██╔╝  
    ██║     ╚███╔███╔╝██║ ╚████║██║  ██║╚██████╔╝███████╗   ██║      ██║      ██║   
    ╚═╝      ╚══╝╚══╝ ╚═╝  ╚═══╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝      ╚═╝      ╚═╝   
                                                                                        
       
                    |===============================================|
                    | Github: https://github.com/CyrisXD/Pwnagetty  |
                    | Twitter: @sudo_overflow                       |
                    |===============================================|

            `)
}


//================================================
// Check if database exists, otherwise create it.
//================================================
createDB = () => {
    return new Promise((resolve, reject) => {
        fs.writeFile(config.database, '[]', { flag: 'wx' }, function (err) {
            if (err) {
                // Already exists, just resolve
                err.code == 'EEXIST' ? resolve('Database available.') : resolve("Error creating database...")
            } else {
                // Create the file then resolve
                resolve("Database created.")
            }
        });
    })
}

//============================
// Read the current database
//============================
readDB = () => {
    return new Promise((resolve, reject) => {
        fs.readFile(config.database, function (err, data) {
            if (err) {
                reject('Unable to read database: ' + err)
                return
            };
            console.log("Reading Database... \n");
            let json = JSON.parse(data)
            resolve(json)
        });
    })
}

//=================================
// Get all files in the directory
//=================================
readDir = () => {
    return new Promise((resolve, reject) => {
        fs.readdir(config.localDir, function (err, files) {
            //handling error
            if (err) {
                reject('Unable to scan directory: ' + err);
            }
            resolve(files)
        });
    })
}


//=====================================
// Download all files from Pwnagotchi
//=====================================
async function getFiles() {
    const client = new SftpClient();
    const dst = config.localDir;
    const src = config.handshakeDir

    // if '/pcap' doesn't exist, create it.
    if (!fs.existsSync(dst)) {
        fs.mkdirSync(dst);
    }
    // connect to pwnagotchi and get files
    try {
        await client.connect(config);
        console.log("Connecting to Pwnagotchi... \n")
        let count = 0;
        client.on('download', info => {
            count++
            process.stdout.write(`Downloaded ${count} captures...` + '\r');
        });
        let rslt = await client.downloadDir(src, dst);
        console.log(`\n`);
        return rslt;
    } finally {
        client.end();
    }
}

//===============================================================
// Extract SSID from PCAP file - Terrible way using Aircrack-ng
//===============================================================
function grabBSSID(file) {
    return new Promise((resolve, reject) => {
        let aircrack = exec(`aircrack-ng ${config.localDir}${file}`, function (error, stdout) {
            if (error) {
                resolve(resolve)
            }
        });

        aircrack.stdout.on('data', (data) => {
            if (data.indexOf('Choosing first network as target') > -1 || data.indexOf('Index number of target network ?') > -1) {
                if (data.match(/\b([0-9A-F]{2}[:-]){5}([0-9A-F]){2}\b/gmi)) {
                    let mac = data.match(/\b([0-9A-F]{2}[:-]){5}([0-9A-F]){2}\b/gmi);
                    aircrack.kill('SIGTERM')
                    resolve(mac[0])
                   
                } else {
                    resolve()
                }
            }
        })
    });

}


//=======================================
// Convert the file to appriate format.
//=======================================
function convertFile(file) {
    return new Promise((resolve, reject) => {
        console.log("Processing: " + file);
        // We favour PMKID's, if we find that we ignore handshakes, if no PMKID is found then we look for a handshake.
        let convertPMKIDs = exec(`hcxpcaptool -z ./pmkid/${file.replace('.pcap', '')}.pmkid ${config.localDir + file}`, function (error, stdout) {
            if (error) { reject(error) };

            if (stdout.includes("PMKID(s) written")) {
                console.log("Found PMKID");
                resolve(true)
            } else {
                let convertHCCAPX = exec(`hcxpcaptool -o ./hccapx/${file.replace('.pcap', '')}.hccapx ${config.localDir + file}`, function (error, stdout) {
                    if (error) { reject(error) };
                    if (stdout.includes("handshake(s) written")) {
                        console.log("Found Handshake");
                        resolve(true)
                    } else {
                        resolve("No PMKID or Handshake found.")
                    }
                });
            }
        });
    })
}

//=================
// Main Process
//=================
async function main() {
    try {
        logo();
        await createDB();
        await getFiles();

        let files = await readDir();
        let db = await readDB();


        // if '/pmkid' doesn't exist, create it.
        if (!fs.existsSync('./pmkid')) {
            fs.mkdirSync('./pmkid');
        }
        // if '/hccapx' doesn't exist, create it.
        if (!fs.existsSync('./hccapx')) {
            fs.mkdirSync('./hccapx');
        }

        // Loop over files that were downloaded
        for (let file of files) {
            // Create filename
            let pos = file.lastIndexOf('_');
            var filename = file.substring(0, pos);

            let BSSID = await grabBSSID(file);

            if (!BSSID) {
                console.log(`No BSSID found for ${file}`)
            } else {
                if (db.indexOf(BSSID) > -1) {
                    // SSID exists in DB.
                    console.log(`BSSID already exists (previously converted) - ${filename} - ${BSSID} \n`);
                } else {
                    // SSID doesn't exist.

                    let result = await convertFile(file);
                    if (result == true) {
                        db.push(BSSID)
                        console.log(`Added ${filename} to database with BSSID: ${BSSID} \n`);
                    } else {
                        console.log(result + "\n")
                    }
                }
            }


        };

        // Write data back to database
        fs.writeFile(config.database, JSON.stringify(db), () => {
            console.log("Updated database... \n \n")
            console.log("===================")
            console.log("   All done.  ")
            console.log("=================== \n")
            console.log("\n \n")
            process.exit(1);
        })

    } catch (err) {
        console.log("Main catch: " + err)
    }
}

main();

