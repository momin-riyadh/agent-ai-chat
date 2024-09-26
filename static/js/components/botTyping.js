
/**
 * removes the bot typing indicator from the chat screen
 */
function hideBotTyping() {
    $("#botAvatar").remove();
    $(".botTyping").remove();
}

/**
 * adds the bot typing indicator from the chat screen
 */
function showBotTyping() {
    const botTyping = '<img width="35" class="botAvatar" id="botAvatar" src="./static/img/disha.svg"/>' +
        '<div class="botTyping"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>';
    $(botTyping).appendTo(".chats");
    $(".botTyping").show();
    scrollToBottomOfResults();
}
