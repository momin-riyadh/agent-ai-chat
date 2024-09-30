// peer connection
var pc = null;
var dc = null, dcInterval = null;
var audio1 = "nn";
var stopper_cnt = 0

// start_btn = document.getElementById('start');
// stop_btn = document.getElementById('stop');
// statusField = document.getElementById('status');
const microphoneIcon = document.getElementById("sendButton");
// const userInput = document.getElementById("userInput");
const paperplaneIcon = document.getElementById("sendButton");

var micrIcon = document.getElementById('fa-microphone');

// Fixme Class Name
var loader = document.querySelector('.g-loader');

var mic_toggle = 0


function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

var sender=generateUUID();

function btn_show_stop() {
    microphoneIcon.innerHTML = '<i id="fa-microphone" class="fa fa-microphone-slash" aria-hidden="true" style="display: block;"></i>'
}

function btn_show_start() {
    microphoneIcon.innerHTML = '<i id="fa-microphone" class="fa fa-microphone" aria-hidden="true" style="display: block;"></i>'
}

function negotiate() {
    return pc.createOffer().then(function (offer) {
        return pc.setLocalDescription(offer);
    }).then(function () {
        return new Promise(function (resolve) {
            if (pc.iceGatheringState === 'complete') {
                resolve();
            } else {
                function checkState() {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', checkState);
                        resolve();
                    }
                }

                pc.addEventListener('icegatheringstatechange', checkState);
            }
        });
    }).then(function () {
        var offer = pc.localDescription;
        console.log(offer.sdp);
        return fetch('https://aibot.gplex.com/offer', {
            body: JSON.stringify({
                sdp: offer.sdp,
                type: offer.type,
            }),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        });
    }).then(function (response) {
        return response.json();
    }).then(function (answer) {
        console.log(answer.sdp);
        return pc.setRemoteDescription(answer);
    }).catch(function (e) {
        console.log(e);
        btn_show_start();
    });
}

function performRecvText(str) {
    document.getElementById('userInput').value = str;

}

function performRecvPartial(str) {
    document.getElementById('userInput').value = str;

}

function starter(){
    if(stopper_cnt > 0){
        stopper_cnt = 0
    }

    start();

    k = setInterval(function(){
        if(stopper_cnt > 3){
            const text = $(".usrInput").val();
            if (text === "" || $.trim(text) === "") {
                // e.preventDefault();
                return;
            }
            custom_send_message();
            stopper_cnt = 0
        }
    }, 50);

    // setTimeout(function (){
    //     stop();
    // },5000);
}

microphoneIcon.addEventListener("click", function() {
    if (mic_toggle == 2){
        microphoneIcon.innerHTML = '<i id="fa-microphone" class="fa fa-microphone" aria-hidden="true" style="display: block;"></i>';
        mic_toggle = 0
        console.log("**** 2")
    }else if(mic_toggle == 0){
        console.log("**** 0")
        mic_toggle = 1;
        starter();
        document.getElementById('userInput').readOnly = true;
    }else{
        console.log("**** 1")
        mic_toggle = 0
        stop();
        document.getElementById('userInput').readOnly = false;
    }

});

function start() {
    if (audio1 !== 'nn') {
        audio1.pause();
        audio1.currentTime = 0;
    }

    microphoneIcon.style.display = 'none';
    loader.style.display = 'block';

    // statusField.innerText = 'Connecting...';
    var config = {
        sdpSemantics: 'unified-plan'
    };

    pc = new RTCPeerConnection(config);

    dc = pc.createDataChannel('result');
    dc.onclose = function () {
        clearInterval(dcInterval);
        console.log('Closed data channel');
        btn_show_start();
    };
    dc.onopen = function () {
        console.log('Opened data channel');
    };
    dc.onmessage = function (messageEvent) {
        // statusField.innerText = "Listening... say something";
        btn_show_stop();
        microphoneIcon.style.display = 'block';
        loader.style.display = 'none';
        if (!messageEvent.data) {
            return;
        }

        let voskResult;
        try {
            voskResult = JSON.parse(messageEvent.data);
        } catch (error) {
            console.error(`ERROR: ${error.message}`);
            return;
        }
        if ((voskResult.text?.length || 0) > 0) {
            performRecvText(voskResult.text);
        } else if ((voskResult.partial?.length || 0) > 0) {
            stopper_cnt = 0
            performRecvPartial(voskResult.partial);
        }else{
            stopper_cnt += 1
        }
    };

    pc.oniceconnectionstatechange = function () {
        if (pc.iceConnectionState == 'disconnected') {
            console.log('Disconnected');
            btn_show_start();
        }
    }

    var constraints = {
        audio: true,
        video: false,
    };

    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        stream.getTracks().forEach(function (track) {
            pc.addTrack(track, stream);
        });
        return negotiate();
    }, function (err) {
        console.log('Could not acquire media: ' + err);
        btn_show_start();
    });
}

function stop() {
    // close data channel
    microphoneIcon.style.display = 'block';
    loader.style.display = 'none';
    if (dc) {
        dc.close();
    }

    // close transceivers
    if (pc.getTransceivers) {
        pc.getTransceivers().forEach(function (transceiver) {
            if (transceiver.stop) {
                try {
                    transceiver.stop();
                    } catch (error) {
                    console.error('Error stopping transceiver:', error);
                    }
            }
        });
    }

    // close local audio / video
    pc.getSenders().forEach(function (sender) {
        sender.track.stop();
    });

    // send_message();

    // close peer connection
    setTimeout(function () {
        pc.close();
    }, 500);
}

// function send() {
//     send_message();
// }
