const users = [];
const addUser = (username) => {
    const name = username.trim().toLowerCase();
    const existingUser = users.find((u) => u === name);
    if (!username.trim()) return { error: 'Name is required' };
    if (existingUser) {
        return {
            error: 'Name is already taken'
        };
    } else {
        users.push(name);
        return username;
    }
};

const chat = (io) => {
    io.on("connection", (socket) => {
        console.log("SOCKET ID:", socket.id);
        socket.on('username', (username, next) => {
            let result = addUser(username);
            if (result.error) {
                return next(result.error);
            } else {
                io.emit('users', users);
                socket.broadcast.emit('User joined', `${username} has joined the chatroom`);
            }
        });

        // message
        socket.on("message", (message) => {
            io.emit("message", message);
        });

        // disconnect
        socket.on("disconnect", () => {
            console.log("User Disconnected");
        });
    });
};

export default chat;