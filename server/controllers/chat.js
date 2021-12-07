const chat = (io) => {
    io.on("connection", (socket) => {
        console.log("SOCKET ID:", socket.id);
        socket.on("disconnect", () => {
            console.log("User Disconnected");
        });
    });
};

export default chat;