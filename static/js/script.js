let ruk_b = 0

/* module for importing other js files */
function include(file) {
  const script = document.createElement('script');
  script.src = file;
  script.type = 'text/javascript';
  script.defer = true;

  document.getElementsByTagName('head').item(0).appendChild(script);
}


// Bot pop-up intro
document.addEventListener("DOMContentLoaded", () => {
  const elemsTap = document.querySelector(".tap-target");
  // eslint-disable-next-line no-undef
  const instancesTap = M.TapTarget.init(elemsTap, {});
  instancesTap.open();
  setTimeout(() => {
    instancesTap.close();
  }, 1200);
});

/* import components */
include('./static/js/components/index.js');
include('./static/client.js');
// include('./static/js/components/chat.js');

window.addEventListener('load', () => {
  // initialization
  $(document).ready(() => {
    // Bot pop-up intro
    $("div").removeClass("tap-target-origin");

    // drop down menu for close, restart conversation & clear the chats.
    $(".dropdown-trigger").dropdown();

    // initiate the modal for displaying the charts,
    // if you dont have charts, then you comment the below line
    $(".modal").modal();

    // enable this if u have configured the bot to start the conversation.
    // showBotTyping();
    // $("#userInput").prop('disabled', true);

    // if you want the bot to start the conversation
    // customActionTrigger();
  });
  // Toggle the chatbot screen
  $("#profile_div").click(() => {
    $(".profile_div").toggle();
    $(".widget").toggle();
    if(ruk_b == 0){
      ruk_b = 1
      send('hi');
    }
  });

  // clear function to clear the chat contents of the widget.
  $("#clear").click(() => {
    $(".chats").fadeOut("normal", () => {
      $(".chats").html("");
      $(".chats").fadeIn();
    });
  });

  // close function to close the widget.
  $("#close").click(() => {
    mic_toggle = 0
    if (audio1 !== 'nn') {
      audio1.pause();
      audio1.currentTime = 0;
    }
    $(".profile_div").toggle();
    $(".widget").toggle();
    scrollToBottomOfResults();
    stop();
  });
});

// setUserResponse("Hello");
// setBotResponse(data[0].text);
// send(text);


const socket = io();
socket.emit("join_room", {userName: "agent1", room: "room1"})
socket.emit("join_room", {userName: "agent2", room: "room2"})
socket.emit("join_room", {userName: "agent3", room: "room3"})


let currentSender = null;
let currentSock = null;
let previousSelectedSender = null;

let noBotRukAgent = {};

socket.on("addClient", function(data){
  //   const clientList = document.getElementById('rukUsersList');
  //   clientList.innerHTML += `
  //     <div class="d-flex flex-stack py-4">
  //         <!--begin::Details-->
  //         <div class="d-flex align-items-center">
  //             <!--begin::Avatar-->
  //             <div class="symbol symbol-45px symbol-circle">
  //                 <span class="symbol-label bg-light-danger text-danger fs-6 fw-bolder">E</span>
  //                 <div class="symbol-badge bg-success start-100 top-100 border-4 h-15px w-15px ms-n2 mt-n2"></div>
  //             </div>
  //             <!--end::Avatar-->
  //             <!--begin::Details-->
  //             <div class="ms-5">
  //                 <a href="javascript:void(0)" onclick="loadChat('${data['userName']}'); event.preventDefault();" class="fs-5 fw-bolder text-gray-900 text-hover-primary mb-2">${data['userName']}</a>
  //                 <div class="fw-bold text-muted">rukon@intenso.com</div>
  //             </div>
  //             <!--end::Details-->
  //         </div>
  //         <!--end::Details-->
  //         <!--begin::Last seen-->
  //         <div class="d-flex flex-column align-items-end ms-2">
  //             <span class="text-muted fs-7 mb-1">5 hrs</span>
  //             <span class="badge badge-sm badge-circle badge-light-danger">5</span>
  //         </div>
  //         <!--end::Last seen-->
  //     </div>
  // `;
    // clientList.innerHTML += `
    //     <label class="client-item new-message" data-sender="${data['userName']}">
    //         <input type="radio" name="client" class="client-radio" value="${data['userName']}">
    //         ${data['userName']}
    //     </label>`;


    socket.emit("join_room", data);
});

socket.on("chatAddClient", function(data) {
  const clientList = document.getElementById('rukUsersList');
  clientList.innerHTML += `
      <div class="d-flex flex-stack py-4">
          <!--begin::Details-->
          <div class="d-flex align-items-center">
              <!--begin::Avatar-->
              <div class="symbol symbol-45px symbol-circle">
                  <span class="symbol-label bg-light-danger text-danger fs-6 fw-bolder">E</span>
                  <div class="symbol-badge bg-success start-100 top-100 border-4 h-15px w-15px ms-n2 mt-n2"></div>
              </div>
              <!--end::Avatar-->
              <!--begin::Details-->
              <div class="ms-5">
                  <a href="javascript:void(0)" onclick="loadChat('${data['sender']}'); event.preventDefault();" class="fs-5 fw-bolder text-gray-900 text-hover-primary mb-2">${data['sender']}</a>
                  <div class="fw-bold text-muted">rukon@intenso.com</div>
              </div>
              <!--end::Details-->
          </div>
          <!--end::Details-->
          <!--begin::Last seen-->
          <div class="d-flex flex-column align-items-end ms-2">
              <span class="text-muted fs-7 mb-1">5 hrs</span>
              <span class="badge badge-sm badge-circle badge-light-danger">5</span>
          </div>
          <!--end::Last seen-->
      </div>
  `;
    // if (currentSender == data["sender"]) {
    //     const chatDisplay = document.getElementById('chat-display');
    //     chatDisplay.innerHTML += `<p><strong>Client:</strong> ${data['msg']}</p><hr>`;
    // } else {
    //     // Highlight the client ID in red if it's not the current sender
    //     const clientElement = document.querySelector(`[data-sender="${data['sender']}"]`);
    //     if (clientElement && data.new) {
    //         clientElement.classList.add('new-message');
    //     }
    // }
});

socket.on("addNewMessage", function(data){

  if(currentSender == data.sender){
    buttonVals = data.buttonValues
    if(buttonVals[data.msg["user"]]){
      setUserResponse(buttonVals[data.msg["user"]]);
    }else{
      setUserResponse(data.msg["user"]);
    }

    setBotResponse(data.msg["bot"]);
  }

})


// Function to load chat data and display reply section
function loadChat(sender) {
  const chatsDiv = document.getElementById('chats');
  while (chatsDiv.firstChild) {
      chatsDiv.removeChild(chatsDiv.firstChild);  // Removes all existing chat elements
  }

  fetch(`/chat/${sender}`)
      .then(response => response.json())
      .then(data => {
          const chatHistory = data.chat_history;  // Access chat history
          const buttonsData = data.buttons_data;  // Access buttons data
          // console.log(buttonsData);
          let buttonsDict = buttonsData;


          chatHistory.forEach(chat => {
              if (chat.client) {
                  // Check if there's a corresponding value in buttonsDict
                  if (buttonsDict[chat.client]) {
                      console.log(`Using button value for client: ${buttonsDict[chat.client]}`);
                      setUserResponse(buttonsDict[chat.client]); // Use value from buttonsDict
                  } else {
                      console.log(`No button value found for client: ${chat.client}`);
                      setUserResponse(chat.client); // Use chat.client directly
                  }
              }
              if (chat.bot) {
                  setBotResponse(chat.bot);
              }
              if (chat.agent) {
                  setBotResponse(chat.agent);
              }
          });

          currentSender = sender;
          document.getElementById('reply-section').style.display = 'block'; // Show reply section
      })
      .catch(error => console.error('Error fetching chat data:', error));
}


document.addEventListener('change', function(event) {
    if (event.target.classList.contains('client-radio')) {
        const selectedSender = event.target.value;

        const clientItems = document.querySelectorAll('.client-item');
        clientItems.forEach(item => {
            // Always remove the 'selected' class from all items
            item.classList.remove('selected');
            
            // Add 'selected' class only to the clicked/selected item
            if (item.getAttribute('data-sender') === selectedSender) {
                item.classList.add('selected');

                // Check and remove 'new-message' class only for the selected item
                if (item.classList.contains('new-message')) {
                    item.classList.remove('new-message');
                }
            }
        });

        // Load the chat for the selected client
        loadChat(selectedSender);

        previousSelectedSender = selectedSender;
    }
});


// Handle sending the reply
document.getElementById('send-reply').addEventListener('click', function() {

    currentSock = io.connect("http://192.168.10.92:5025");
    const replyInput = document.getElementById('reply-input').value;
    noBotRukAgent[currentSender] = 1;

    socket.emit("clientAgentStatus", {"sender": currentSender, "msg": replyInput});

    const chatDisplay = document.getElementById('chat-display');
    chatDisplay.innerHTML += `<p><strong>Agent:</strong> ${replyInput}</p><hr>`
    
    // console.log(userSID)
    if (replyInput && currentSender) {
        currentSock.emit("recieveAgentMessage", {
            "sender": currentSender, 
            "reply": replyInput
        });
    }
    document.getElementById('reply-input').value = "";
});