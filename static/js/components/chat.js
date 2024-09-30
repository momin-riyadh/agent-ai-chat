/**
 * scroll to the bottom of the chats after new message has been added to chat
 */
const converter = new showdown.Converter();
var audio1 = "nn";

document.getElementById("userInput").addEventListener("input", function() {
    if (document.getElementById("userInput").value.trim() === "") {
        microphoneIcon.innerHTML = '<i id="fa-microphone" class="fa fa-microphone" aria-hidden="true" style="display: block;"></i>';
        mic_toggle = 0
    } else {
        // console.log(document.getElementById("userInput").value);
        microphoneIcon.innerHTML = '<i id="fa-microphone" class="fa fa-paper-plane" aria-hidden="true" style="display: block;"></i>';
        mic_toggle = 2
    }
  });
  
  document.getElementById("userInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        // Reset the microphone icon to active mode
        event.preventDefault();
        microphoneIcon.innerHTML = '<i id="fa-microphone" class="fa fa-microphone" aria-hidden="true" style="display: block;"></i>';
        mic_toggle = 1
        // send(userInput_new.value);

        currentSock = io.connect("http://192.168.10.92:5025");
        const replyInput = document.getElementById("userInput").value;
        setBotResponse([{"test_message": currentSender, "text":replyInput}]);
        if (replyInput && currentSender) {
            currentSock.emit("recieveAgentMessage", {
                "sender": currentSender, 
                "reply": replyInput
            });
        }
  
        socket.emit("clientAgentStatus", {"sender": currentSender, "msg": replyInput});
        
        document.getElementById('userInput').value = "";
    }
  });



function scrollToBottomOfResults() {
    const terminalResultsDiv = document.getElementById("chats");
    terminalResultsDiv.scrollTop = terminalResultsDiv.scrollHeight;
}

/**
 * Set user response on the chat screen
 * @param {String} message user message
 */
async function setUserResponse(message) {
    const user_response = `
<div class="userAvatar">
<div class="userAvatar-image">
    <img src='./static/img/userAvatar.png'>
</div>
<p class="userMsg">${message} </p>
</div>
<div class="clearfix"></div>
`;
    $(user_response).appendTo(".chats").show("slow");

    $(".usrInput").val("");
    scrollToBottomOfResults();
    showBotTyping();
    // $(".suggestions").remove();
}

/**
 * returns formatted bot response
 * @param {String} text bot message response's text
 *
 */
function getBotResponse(text) {
    // botResponse = `<img class="botAvatar" src="./static/img/bot-ai-logo.png"/><span class="botMsg">${text}</span><div class="clearfix"></div>`;
    botResponse = `
        <div class="botAvatar">
        <div class="botAvatar-image">
            <img src="./static/img/disha.svg"/>
        </div>
        <span class="botMsg">${text}</span>
        </div>
        <div class="clearfix"></div>
    `;
    return botResponse;
}


function setBotResponse(response) {
    console.log("SetBotResponse:", response);

    hideBotTyping();

    if (response.length < 1) {
        const fallbackMsg = "I’m unable to find the information you’re looking for. \n" +
            "\n" + "<br/>" +
            "Please try asking in a different way or reach out to our support team for help. Is there anything else I can assist you with?";

        const BotResponse = `
            <div class="botAvatar">
                <div class="botAvatar-image">
                    <img src="./static/img/disha.svg"/>
                </div>
                <p class="botMsg">${fallbackMsg}</p>
            </div>
            <div class="clearfix"></div>`;

        $(BotResponse).appendTo(".chats").hide().fadeIn(1000);
        scrollToBottomOfResults();
    } else {
        // If we get response from the bot
        for (let i = 0; i < response.length; i++) {
            if (Object.hasOwnProperty.call(response[i], "text") && response[i].text != null) {
                let botResponse;
                let html = converter.makeHtml(response[i].text);
                html = html.replaceAll("<p>", "")
                           .replaceAll("</p>", "")
                           .replaceAll("<strong>", "<b>")
                           .replaceAll("</strong>", "</b>");
                html = html.replace(/(?:\r\n|\r|\n)/g, "<br>");

                // Handle different response cases like images, blockquotes, etc.
                if (html.includes("<blockquote>")) {
                    html = html.replaceAll("<br>", "");
                    botResponse = getBotResponse(html);
                } else if (html.includes("<img")) {
                    html = html.replaceAll("<img", '<img class="imgcard_mrkdwn" ');
                    botResponse = getBotResponse(html);
                } else if (html.includes("<pre") || html.includes("<code>")) {
                    botResponse = getBotResponse(html);
                } else if (html.includes("<ul") || html.includes("<ol") || html.includes("<li") || html.includes("<h3")) {
                    html = html.replaceAll("<br>", "");
                    botResponse = getBotResponse(html);
                } else {
                    // Default response format if no markdown found
                    botResponse = `
                        <div class="botAvatar">
                            <div class="botAvatar-image">
                                <img src="./static/img/disha.svg"/>
                            </div>
                            <p class="botMsg">${response[i].text}</p>
                        </div>
                        <div class="clearfix"></div>`;
                }

                // Append the bot response to the chat
                $(botResponse).appendTo(".chats").hide().fadeIn(1000);
            }

            // Handle images
            if (Object.hasOwnProperty.call(response[i], "image") && response[i].image !== null) {
                const BotResponse = `<div class="singleCard"><img class="imgcard" src="${response[i].image}"></div><div class="clearfix"></div>`;
                $(BotResponse).appendTo(".chats").hide().fadeIn(1000);
            }

            // Handle buttons
            if (Object.hasOwnProperty.call(response[i], "buttons") && response[i].buttons.length > 0) {
                addSuggestion(response[i].buttons);
            }

            // Handle attachments (e.g., videos)
            if (Object.hasOwnProperty.call(response[i], "attachment") && response[i].attachment !== null && response[i].attachment.type === "video") {
                const video_url = response[i].attachment.payload.src;
                const BotResponse = `<div class="video-container"><iframe src="${video_url}" frameborder="0" allowfullscreen></iframe></div>`;
                $(BotResponse).appendTo(".chats").hide().fadeIn(1000);
            }

            // Handle custom messages (e.g., charts, quick replies)
            if (Object.hasOwnProperty.call(response[i], "custom")) {
                const { payload } = response[i].custom;

                if (payload === "quickReplies") {
                    const quickRepliesData = response[i].custom.data;
                    showQuickReplies(quickRepliesData);
                    return;
                } else if (payload === "pdf_attachment") {
                    renderPdfAttachment(response[i]);
                    return;
                } else if (payload === "dropDown") {
                    const dropDownData = response[i].custom.data;
                    renderDropDwon(dropDownData);
                    return;
                } else if (payload === "location") {
                    $("#userInput").prop("disabled", true);
                    getLocation();
                    scrollToBottomOfResults();
                    return;
                } else if (payload === "cardsCarousel") {
                    const restaurantsData = response[i].custom.data;
                    showCardsCarousel(restaurantsData);
                    return;
                } else if (payload === "chart") {
                    const chartData = response[i].custom.data;
                    createChart(chartData.title, chartData.labels, chartData.backgroundColor, chartData.chartsData, chartData.chartType, chartData.displayLegend);
                    return;
                } else if (payload === "collapsible") {
                    const data = response[i].custom.data;
                    createCollapsible(data);
                }
            }
        }

        scrollToBottomOfResults();
    }

    $(".usrInput").focus();
}



/**
 * sends the user message to the rasa server,
 * @param {String} message user message
 */



function send(message){
    var userInput=message

    console.log(userInput);

    if(userInput.length<=0){
        return;
    }
    var xhr = new XMLHttpRequest();
    //x = xhr.open('GET', 'http://192.168.11.105:5025/message?sender='+sender+'&output=' + encodeURIComponent(userInput), true);
    x = xhr.open('GET', 'http://192.168.11.105:5025?sender='+sender+'&output=' + encodeURIComponent(userInput), true);

    console.log('XHR request initial ized');

    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);

            console.log("Response from server: ", data);

            setBotResponse(data[0].text);
            let audioData = atob(data[0].audio);
            let audioArray = new Uint8Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
                audioArray[i] = audioData.charCodeAt(i);
            }
            let audioBlob = new Blob([audioArray.buffer], { type: 'audio/wav' });

            // Create a URL for the blob
            var url = URL.createObjectURL(audioBlob);

            // Create a new Audio object and play the audio
            audio1 = new Audio(url);
            audio1.autoplay = true;

            // $("#userInput").val("");
        }
    };

    xhr.onerror = function () {
        // Handle the error case
        console.error('An error occurred while making the request.');
    };

    xhr.send(null);
}

function actionTrigger() {
    $.ajax({
        url: `http://localhost:5005/conversations/${sender_id}/execute`,
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            name: action_name,
            policy: "MappingPolicy",
            confidence: "0.98",
        }),
        success(botResponse, status) {
            console.log("Response from Rasa: ", botResponse, "\nStatus: ", status);

            if (Object.hasOwnProperty.call(botResponse, "messages")) {
                setBotResponse(botResponse.messages);
            }
            $("#userInput").prop("disabled", false);
        },
        error(xhr, textStatus) {
            // if there is no response from rasa server
            setBotResponse("");
            console.log("Error from bot end: ", textStatus);
            $("#userInput").prop("disabled", false);
        },
    });
}

/**
 * sends an event to the custom action server,
 *  so that bot can start the conversation by greeting the user
 *
 * Make sure you run action server using the command
 * `rasa run actions --cors "*"`
 *
 * `Note: this method will only work in Rasa 2.x`
 */
// eslint-disable-next-line no-unused-vars
function customActionTrigger() {
    $.ajax({
        url: "http://localhost:5055/webhook/",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            next_action: action_name,
            tracker: {
                sender_id,
            },
        }),
        success(botResponse, status) {
            console.log("Response from Rasa: ", botResponse, "\nStatus: ", status);

            if (Object.hasOwnProperty.call(botResponse, "responses")) {
                setBotResponse(botResponse.responses);
            }
            $("#userInput").prop("disabled", false);
        },
        error(xhr, textStatus) {
            // if there is no response from rasa server
            setBotResponse("");
            console.log("Error from bot end: ", textStatus);
            $("#userInput").prop("disabled", false);
        },
    });
}

/**
 * clears the conversation from the chat screen
 * & sends the `/resart` event to the Rasa server
 */
function restartConversation() {
    $("#userInput").prop("disabled", false);
    // destroy the existing chart
    $(".collapsible").remove();

    if (typeof chatChart !== "undefined") {
        chatChart.destroy();
    }

    $(".chart-container").remove();
    if (typeof modalChart !== "undefined") {
        modalChart.destroy();
    }
    $(".chats").html("");
    $(".usrInput").val("");
    send("Hi!");
}

// triggers restartConversation function.
$("#restart").click(() => {
    restartConversation();
});




/**
 * if user hits enter or send button
 * */
$(".usrInput").on("keyup keypress", (e) => {
    if (audio1 !== 'nn') {
        audio1.pause();
        audio1.currentTime = 0;
    }
    const keyCode = e.keyCode || e.which;

    const text = $(".usrInput").val();
    if (keyCode === 13) {
        if (text === "" || $.trim(text) === "") {
            e.preventDefault();
            return false;
        }
        // destroy the existing chart, if yu are not using charts, then comment the below lines
        $(".collapsible").remove();
        $(".dropDownMsg").remove();
        if (typeof chatChart !== "undefined") {
            chatChart.destroy();
        }

        $(".chart-container").remove();
        if (typeof modalChart !== "undefined") {
            modalChart.destroy();
        }

        $("#paginated_cards").remove();
        $(".suggestions").remove();
        $(".quickReplies").remove();
        $(".usrInput").blur();
        setUserResponse(text);
        send(text);
        //send_message();
        e.preventDefault();
        return false;
    }
    return true;
});

$("#sendButton").on("click", (e) => {
    if (audio1 !== 'nn') {
        audio1.pause();
        audio1.currentTime = 0;
    }
    const text = $(".usrInput").val();
    if (text === "" || $.trim(text) === "") {
        e.preventDefault();
        return false;
    }
    // destroy the existing chart
    if (typeof chatChart !== "undefined") {
        chatChart.destroy();
    }

    $(".chart-container").remove();
    if (typeof modalChart !== "undefined") {
        modalChart.destroy();
    }

    $(".suggestions").remove();
    $("#paginated_cards").remove();
    $(".quickReplies").remove();
    $(".usrInput").blur();
    $(".dropDownMsg").remove();
    setUserResponse(text);
    send(text);
    //send_message();
    e.preventDefault();
    return false;
});

function custom_send_message(){
    if (audio1 !== 'nn') {
        audio1.pause();
        audio1.currentTime = 0;
    }
    const text = $(".usrInput").val();
    if (text === "" || $.trim(text) === "") {
        // e.preventDefault();
        return false;
    }
    // destroy the existing chart
    if (typeof chatChart !== "undefined") {
        chatChart.destroy();
    }

    $(".chart-container").remove();
    if (typeof modalChart !== "undefined") {
        modalChart.destroy();
    }

    $(".suggestions").remove();
    $("#paginated_cards").remove();
    $(".quickReplies").remove();
    $(".usrInput").blur();
    $(".dropDownMsg").remove();
    setUserResponse(text);
    send(text);
    //send_message();
    // e.preventDefault();
    return false;
}

