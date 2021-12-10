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
    // middleware
    io.use((socket, next) => {
        const username = socket.handshake.auth.username;
        if (!username) {
            return next(new Error('Invalid Username'));
        }
        socket.username = username;
        next();
    });

    io.on("connection", (socket) => {
        let users = [];
        for (let [id, socket] of io.of("/").sockets) {
            const existingUser = users.find((u) => u.username === socket.username);
            if (existingUser) {
                socket.emit('username is already taken!');
                socket.disconnect();
                return;
            } else {
                users.push({
                    userID: id,
                    username: socket.username
                });
            }
        }

        socket.emit('users', users);

        // notify existing users on new user join
        socket.broadcast.emit('User Connected', {
            userID: socket.id,
            username: socket.username
        });

        // message
        socket.on("message", (data) => {
            io.emit("message", data);
        });

        // typing
        socket.on("typing", (username) => {
            socket.broadcast.emit('typing', `${username} typing...`);
        });

        // private message
        socket.on("private message", ({ message, to }) => {
            socket.to(to).emit("private message", {
                message,
                from: socket.id
            });
        });

        // disconnect
        socket.on("disconnect", () => {
            socket.broadcast.emit('user disconnected', socket.id);
        });
    });
};

export default chat;