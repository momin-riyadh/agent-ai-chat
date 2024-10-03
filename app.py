from flask import Flask, render_template, request, json, jsonify, redirect, url_for
from flask_socketio import SocketIO, emit, join_room
import requests
import os
from flask_login import LoginManager, login_user, logout_user, login_required, current_user, UserMixin


app = Flask(__name__)
app.secret_key = 'your_secret_key'
socketio = SocketIO(app, cors_allowed_origins="*", ping_interval=2, ping_timeout=10)

login_manager = LoginManager(app)
login_manager.login_view = 'signin'

agent_room_dict = {
    "agent1@gmail.com": "room1",
    "agent2@gmail.com": "room2",
    "agent3@gmail.com": "room3",
}

registered_user = {}
registered_user["b5a9e597-dadc-42d3-a3a9-174fcec83460"]="b5a9e597-dadc-42d3-a3a9-174fcec83460"
all_rooms = {}
agentReplied = {}

def roomManager():
    global all_rooms
    roomCapacity = 5
    if len(all_rooms["room1"]) < roomCapacity:
        return "room1"
    if len(all_rooms["room2"]) < roomCapacity:
        return "room2"
    if len(all_rooms["room3"]) < roomCapacity:
        return "room3"

class User(UserMixin):
    def __init__(self, id, room_name):
        self.id = id
        self.room_name = room_name  # Add room_name to track the user's room

    # This is required by Flask-Login to identify the user
    def get_id(self):
        return self.id

    def get_room(self):
        return self.room_name


@login_manager.user_loader
def load_user(user_id):
    room_name = agent_room_dict.get(user_id, "room1")
    return User(user_id, room_name)

@app.route('/dashboard')
@login_required
def dashboard():
    agentName = current_user.get_id()
    currentRoom = current_user.get_room()
    return render_template("index.html", agentName = agentName, currentRoom = currentRoom)

@app.route('/', methods=['GET', 'POST'])
def signin():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        print(f"Email: {email}")
        print(f"Password: {password}")

        if email in agent_room_dict:
            if password == "agent123":
                user = User(email, password)
                login_user(user)
                return redirect(url_for('dashboard'))
    return render_template("sign-in.html")


@app.route('/logout')
@login_required
def logout():
    logout_user()  # Logs the user out
    return redirect(url_for('signin'))  # Redirect to sign-in page after logout


@app.route('/chat')
@login_required
def chatPage():
    currentID = current_user.get_id()
    currentRoom = current_user.get_room()
    return render_template("chat.html", currentID = currentID, currentRoom=currentRoom)

@app.route('/middleware', methods=["GET", "POST"])
def middleware():
    global registered_user
    global agentReplied

    ai_url = "http://192.168.10.92:5001/webhooks/rest/webhook"
    print(request.method)
    data = request.json
    sender = data['sender']
    test_message = data['message']

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

        roomNumber = roomManager()

        if sender not in registered_user:
            registered_user[sender] = sender
            socketio.emit("chatAddClient", {"sender": sender, "new": True, "room": roomNumber})

        if ss not in all_rooms["room1"] and ss not in all_rooms["room2"] and ss not in all_rooms["room3"]:
            socketio.emit("addClient", {"userName": ss, "room": roomNumber})

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
@login_required
def getClients(data):
    # userID = current_user.get_id()
    roomName = current_user.get_room()
    # global registered_user
    global all_rooms
    for v in all_rooms[roomName]:
        if "agent" in v:
            continue
        socketio.emit("chatAddClient", {"sender": v, "new": True, "room": roomName})


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
@login_required
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
@login_required
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
