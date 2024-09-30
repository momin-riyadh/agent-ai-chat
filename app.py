from flask import Flask, render_template, request, json, jsonify
from flask_socketio import SocketIO, emit, join_room
import requests
import os

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", ping_interval=2, ping_timeout=10)
registered_user = {}
# registered_user["b5a9e597-dadc-42d3-a3a9-174fcec83460"]="b5a9e597-dadc-42d3-a3a9-174fcec83460"
all_rooms = {}
agentReplied = {}

@app.route('/dashboard')
def dashboard():
   return render_template("index.html")

@app.route('/')
def signin():
   return render_template("sign-in.html")

@app.route('/chat')
def chatPage():
   return render_template("chat.html")

@app.route('/middleware', methods=["GET", "POST"])
def middleware():
    global registered_user
    global agentReplied

    ai_url = "http://192.168.10.92:5001/webhooks/rest/webhook"
    print(request.method)
    data = request.json
    sender = data['sender']
    test_message = data['message']

    if sender not in registered_user:
        registered_user[sender] = sender
        socketio.emit("chatAddClient", {"msg": test_message, "sender": sender, "new": True})

    ss = str(sender)
    if sender not in agentReplied:
        message = {
            "sender": sender,
            "message": test_message
        }
        headers = {
            "Content-Type": "application/json"
        }
        data = json.dumps(message)
        response = requests.post(ai_url, headers=headers, data=data)

        if ss not in all_rooms["room1"]:
            socketio.emit("addClient", {"userName": ss, "room": "room1"})

        if response.status_code == 200:
            print("Response from Rasa:")
            rasa_response = response.json()
            if len(rasa_response) == 0:
                rasa_response = [{'recipient_id': f'{sender}', 'text': 'Due to internet issue I am unable to response. Please try again with different question'}]

            print("*"*50)
            print(rasa_response)
            print("*"*50)
            buttonVals = getButtonValues()
            socketio.emit("addNewMessage", {"msg": {"user": test_message, "bot": rasa_response}, "sender": sender, "new": True, "buttonValues": buttonVals})

            if not os.path.exists('client_data'):
                os.makedirs('client_data')

            # Prepare the data to be saved
            client_data = {
                "client": test_message,
                "bot": rasa_response
            }

            if "buttons" in rasa_response[0]:
                buttonsFile = f"buttonsFile.json"
                if os.path.exists(buttonsFile):
                    with open(buttonsFile, 'r') as file:
                        buttonsData = json.load(file)
                    for rr in rasa_response[0]["buttons"]:
                        buttonsData[rr["payload"]] = rr["title"]
                    # buttonsData.append(client_data)
                else:
                    buttonsData = {}
                    for rr in rasa_response[0]["buttons"]:
                        buttonsData[rr["payload"]] = rr["title"]
                with open(buttonsFile, 'w') as file:
                    json.dump(buttonsData, file, indent=4)


            file_path = f'client_data/{ss}.json'
            if os.path.exists(file_path):
                with open(file_path, 'r') as file:
                    existing_data = json.load(file)
                existing_data.append(client_data)
            else:
                existing_data = [client_data]

            with open(file_path, 'w') as file:
                json.dump(existing_data, file, indent=4)

            return response.json()
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
    else:
        # Prepare the data to be saved
        socketio.emit("addNewMessage", {"msg": {"user": test_message, "bot": ""}, "sender": sender, "new": True, "buttonValues": [{}]})
        client_data = {
            "client": test_message
        }
        file_path = f'client_data/{ss}.json'
        if os.path.exists(file_path):
            with open(file_path, 'r') as file:
                existing_data = json.load(file)
            existing_data.append(client_data)
        else:
            existing_data = [client_data]

        with open(file_path, 'w') as file:
            json.dump(existing_data, file, indent=4)

    return ""

@socketio.on('join_room')
def handle_message(data):
    global all_rooms
    userName = str(data['userName'])
    room = data['room']

    if room not in all_rooms:
        all_rooms[room] = []

    if userName not in all_rooms[room]:
        all_rooms[room].append(userName)
        join_room(room)
        join_room(userName)
        print(f"{userName} joined {room}")
    else:
        print(f"{userName} is already in {room}")


@socketio.on('getClients')
def getClients(data):
    global registered_user
    for k, v in registered_user.items():
        socketio.emit("chatAddClient", {"msg": "", "sender": v, "new": True})
    


def getButtonValues():
    buttons_file_path = 'buttonsFile.json'
    buttons_data = {}
    if os.path.exists(buttons_file_path):
        with open(buttons_file_path, 'r') as file:
            buttons_data = json.load(file)
    else:
        buttons_data = [{}]
    return buttons_data


@app.route('/chat/<sender_id>', methods=["GET"])
def get_chat(sender_id):
    chat_file_path = f'client_data/{sender_id}.json'


    # Load chat history
    chat_history = []
    if os.path.exists(chat_file_path):
        with open(chat_file_path, 'r') as file:
            chat_history = json.load(file)

    # Load buttons data
    buttons_data = getButtonValues()
    # if os.path.exists(buttons_file_path):
    #     with open(buttons_file_path, 'r') as file:
    #         buttons_data = json.load(file)

    # Return both chat history and buttons data
    print(buttons_data)
    return jsonify({
        "chat_history": chat_history,
        "buttons_data": buttons_data
    })


@socketio.on('clientAgentStatus')
def clientAgentStatus(data):
    global agentReplied
    agentReplied[data["sender"]] = 1
    client_data = {
        "agent": data["msg"]
    }
    file_path = f'client_data/{data["sender"]}.json'
    if os.path.exists(file_path):
        with open(file_path, 'r') as file:
            existing_data = json.load(file)
        existing_data.append(client_data)
    else:
        existing_data = [client_data]

    with open(file_path, 'w') as file:
        json.dump(existing_data, file, indent=4)

if __name__ == "__main__":
    socketio.run(app, host="192.168.10.92", port=6025, debug=True)
