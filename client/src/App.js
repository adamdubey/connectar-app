import { css } from '@emotion/css';
import { useState, useEffect } from 'react';
import ScrollToBottom from 'react-scroll-to-bottom';
import socket from './socket';
import toast, { Toaster } from 'react-hot-toast';
import './App.css';

const ROOT_CSS = css({
  height: 650,
  width: window.innerWidth / 2
});

function App() {
  const [username, setUsername] = useState('');
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [privateMessage, setPrivateMessage] = useState('');

  useEffect(() => {
    socket.on('User Joined', (msg) => {
      console.log('User joined msg', msg);
    });

    socket.on('message', (data) => {
      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: data.id,
          name: data.name,
          message: data.message
        }
      ]);
    });

    return () => {
      socket.off('User Joined');
      socket.off('message');
    };
  }, []);

  useEffect(() => {
    socket.on('User Connected', (user) => {
      user.connected = true;
      user.messages = [];
      user.hasNewMessages = false;
      setUsers((prevUsers) => [...prevUsers, user]);
      toast.success(`${user.username} has joined the chatroom!`);
    });

    socket.on('users', (users) => {
      users.forEach((user) => {
        user.self = user.userID === socket.id;
        user.connected = true;
        user.messages = [];
        user.hasNewMessages = false;
      });

      const sorted = users.sort((a, b) => {
        if (a.self) return -1;
        if (b.self) return 1;
        if (a.username < b.username) return -1;
        return a.username > b.username ? 1 : 0;
      });

      setUsers(sorted);
    });

    socket.on('username taken', () => {
      toast.error('Username is already taken!');
    });

    return () => {
      socket.off('users');
      socket.off('user connected');
      socket.off('username taken');
    };
  }, [socket]);

  useEffect(() => {
    socket.on('user disconnected', (id) => {
      let allUsers = users;
      let index = allUsers.findIndex((el) => el.userID === id);
      let foundUser = allUsers[index];

      foundUser.connected = false;
      allUsers[index] = foundUser;
      setUsers([...allUsers]);

      toast.error(`${foundUser.username} has left the chatroom!`);
    });

    return () => {
      socket.off('user disconnected');
    };
  }, [users, socket]);

  const handleUsername = (e) => {
    e.preventDefault();
    socket.emit('username', username);
    socket.auth = { username };
    socket.connect();
    setTimeout(() => {
      setConnected(true);
    }, 300);
  };

  const handleMessage = (e) => {
    e.preventDefault();

    socket.emit('message', {
      id: Date.now(),
      name: username,
      message
    });

    setMessage('');
  };

  if (message) {
    socket.emit('typing', username);
  };

  useEffect(() => {
    socket.on('typing', data => {
      setTyping(data);
      setTimeout(() => {
        setTyping('');
      }, 1000);
    });
    
    return () => {
      socket.off('typing');
    };
  }, []);

  useEffect(() => {
    socket.on('private message', ({ message, from }) => {
      const allUsers = users;
      let index = allUsers.findIndex((u) => u.userID === from);
      let foundUser = allUsers[index];

      foundUser.messages.push({
        message,
        fromSelf: false
      });

      if (foundUser) {
        if (selectedUser) {
          if (foundUser.userID !== selectedUser.userID) {
            foundUser.hasNewMessages = true;
          }
        } else {
          foundUser.hasNewMessages = true;
        };
          allUsers[index] = foundUser;
          setUsers([ ...allUsers ]);
      };
    });

    return () => {
      socket.off('private message');
    };
  }, [users]);

  const handleUsernameClick = user => {
    if (user.self || !user.connected) return;
    setSelectedUser({ ...user, hasNewMessages: false });

    let allUsers = users;
    let index = allUsers.findIndex((u) => u.userID === user.userID);
    let foundUser = allUsers[index];
    foundUser.hasNewMessages = false;

    allUsers[index] = foundUser;
    setUsers([ ...allUsers ]);
  };

  const handlePrivateMessage = e => {
    e.preventDefault();

    if (selectedUser) {
      socket.emit('private message', {
        message: privateMessage,
        to: selectedUser.userID
      });

      let updated = selectedUser;
      updated.messages.push({
        message: privateMessage,
        fromSelf: true,
        hasNewMessages: false
      });

      setSelectedUser(updated);
      setPrivateMessage('');
    };
  };

  return (
    <div className="App">
      <h1>connectar app</h1>
      <div className="container text-center">
        <Toaster />
        <div className="row">
          <div className="d-flex justify-conent-evenly pt-2 pb-1">
            {connected &&
              users.map(
                (user) =>
                  user.connected && (
                    <div key={user.userID} onClick={() => handleUsernameClick(user)} style={{
                      textDecoration: selectedUser?.userID == user.userID && 'underline',
                      cursor: !user.self && 'pointer'
                    }}>
                      {user.username.charAt(0).toUpperCase() +
                        user.username.slice(1)}{' '}
                      {user.self && '(yourself)'}
                      {user.connected ? (
                        <span className="online-dot"></span>
                      ) : (
                        <span className="offline-dot"></span>
                      )}
                      {user.hasNewMessages && <b className="text-danger"> ! </b>}
                      {user.hasNewMessages && <b className="text-danger">{user.hasNewMessages && user.messages.length}</b>}
                    </div>
                  )
              )}
          </div>
        </div>

      {!connected && (
        <div className="row">
          <form onSubmit={handleUsername} className="text-center pt-3">
            <div className="row g-3">
              <div className="col-md-8">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  type="text"
                  placeholder="Enter your name"
                  className="form-control"
                />
              </div>

              <div className="col-md-4">
                <button className="btn btn-secondary" type="submit">
                  Join
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="row">
        {connected && (
          <div className="col-md-6">
            <form onSubmit={handleMessage} className="text-center pt-3">
              <div className="row g-3">
                <div className="col-10">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    type="text"
                    placeholder="Type your message"
                    className="form-control"
                  />
                </div>

                <div className="col-2">
                  <button className="btn btn-secondary" type="submit">
                    Send
                  </button>
                </div>
              </div>
            </form>

            <br />

            <div className="row pt-3">
              <div className="col">
                <ScrollToBottom className={ROOT_CSS}>
                {messages.map((m) => (
                  <div className="alert alert-secondary" key={m.id}>
                    {m.name.charAt(0).toUpperCase() + m.name.slice(1)} -{' '}
                    {m.message}
                  </div>
                ))}
                </ScrollToBottom>
                <br />
                {typing && typing}
              </div>
            </div>
          </div>
        )}

        <br />

        {selectedUser && (
          <div className="col-md-6">
            <form onSubmit={handlePrivateMessage} className="text-center pt-3">
              <div className="row g-3">
                <div className="col-10">
                  <input
                    value={privateMessage}
                    onChange={(e) => setPrivateMessage(e.target.value)}
                    type="text"
                    placeholder="Type your private message"
                    className="form-control"
                  />
                </div>

                <div className="col-2">
                  <button className="btn btn-secondary" type="submit">
                    Send
                  </button>
                </div>
              </div>
            </form>

            <br />

            <div className="row pt-3">
              <div className="col">
                <ScrollToBottom className={ROOT_CSS}>
                  {selectedUser && selectedUser.messages && selectedUser.messages.map((msg, index) => <div key={index} className="alert alert-secondary">{msg.fromSelf ? "(yourself)" : selectedUser.username.charAt(0).toUpperCase() + selectedUser.username.slice(1)}{" - "}{msg.message}</div>)}
                </ScrollToBottom>
                <br />
                {typing && typing}
              </div>
            </div>
          </div>
        )}

        <br />

      </div>
    </div>
  </div>
  );
}

export default App;
