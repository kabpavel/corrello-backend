const asyncLocalStorage = require('./als.service');
const logger = require('./logger.service');

var gIo = null;

function connectSockets(http, session) {
    gIo = require('socket.io')(http, {
        cors: {
            origin: '*',
        },
    });
    gIo.on('connection', (socket) => {
        console.log('New socket', socket.id);
        socket.on('disconnect', (socket) => {
            console.log('Someone disconnected');
        });

        socket.on('chat topic', topic => {
            if (socket.myTopic === topic) return;
            if (socket.myTopic) {
                socket.leave(socket.myTopic)
            }
            socket.join(topic)
            socket.myTopic = topic
        })
        socket.on('chat newMsg', msg => {
            console.log('Emitting Chat msg', msg);
            // emits to all sockets:
            // gIo.emit('chat addMsg', msg)
            // emits only to sockets in the same room
            gIo.to(socket.myTopic).emit('chat addMsg', msg)
        })
        socket.on('iAmTyping', user => {
            console.log('Got iAmTyping', user);
            // emits to all sockets:
            // gIo.emit('chat addMsg', msg)
            // emits only to sockets in the same room
            // gIo.to(socket.myTopic).emit('chat addMsg', msg)
            socket.broadcast.to(socket.myTopic).emit('userIsTyping', user)
        })
        socket.on('iStoppedTyping', user => {
            console.log('Got iStoppedTyping');
            // emits to all sockets:
            // gIo.emit('chat addMsg', msg)
            // emits only to sockets in the same room
            // gIo.to(socket.myTopic).emit('chat addMsg', msg)
            socket.broadcast.to(socket.myTopic).emit('userStoppedTyping')
        })

        socket.on('SOCKET_EVENT_START_BOARD', (boardId) => {
            console.log('SOCKET_EVENT_START_BOARD', boardId);
            if (socket.currBoardId === boardId) return;
            if (socket.currBoardId) {
                socket.leave(socket.currBoardId);
            }
            socket.join(boardId);
            socket.currBoardId = boardId;
        });

        socket.on('SOCKET_EVENT_ON_BOARD_SAVED', (boardId) => {
            console.log('on-board-saved boardId', boardId);
            socket.broadcast
                .to(socket.currBoardId)
                .emit('SOCKET_EVENT_ON_RELOAD_BOARD', boardId);
        });

        socket.on('SOCKET_EVENT_ON_NEW_ACTIVITY', (activity) => {
            if (activity.card.members) {
                console.log('app activty', activity);
                activity.card.members.forEach((member) => {
                    console.log('members in card activity:', member);
                    if (member._id !== activity.byMember._id)
                        gIo.to(member._id).emit('SOCKET_EVENT_ON_ADD_ACTIVITY', activity);
                });
            }
        });
        socket.on('user logout', userId => {
            gIo.emit('user disconnected', userId)
        })
        socket.on('user-watch', userId => {
            //for notifications
            socket.join(userId)
            //for login
            socket.userId = userId
            gIo.emit('user connected', userId)
            // gIo.to(socket.userId).emit('user connected', userId)
        })

        socket.on('set-user-socket', (userId) => {
            logger.debug(
                `Setting socket.id (${socket.id}) socket.userId = ${userId}`
            );
            socket.userId = userId;
        });
        socket.on('unset-user-socket', (userId) => {
            logger.debug(`Delete socket.id (${socket.id}) socket.userId = ${userId}`);
            delete socket.userId;
        });
        socket.on('saved-board', (boardId) => {
            console.log('On saved board - boardId ', boardId);
            gIo.to(boardId).emit('reload-board', boardId);
        });
    });
}

function emitTo({ type, data, label }) {
    if (label) gIo.to('watching:' + label).emit(type, data);
    else gIo.emit(type, data);
}

async function emitToUser({ type, data, userId }) {
    logger.debug('Emiting to user socket: ' + userId);
    const socket = await _getUserSocket(userId);
    if (socket) socket.emit(type, data);
    else {
        console.log('User socket not found');
        _printSockets();
    }
}

async function _getUserSocket(userId) {
    const sockets = await _getAllSockets();
    const socket = sockets.find((s) => s.userId == userId);
    return socket;
}
async function _getAllSockets() {
    const sockets = await gIo.fetchSockets();
    return sockets;
}

async function _printSockets() {
    const sockets = await _getAllSockets();
    console.log(`Sockets: (count: ${sockets.length}):`);
    sockets.forEach(_printSocket);
}
function _printSocket(socket) {
    console.log(`Socket - socketId: ${socket.id} userId: ${socket.userId}`);
}

async function broadcast({ type, data, room = null, userId }) {
    console.log('BROADCASTING', JSON.stringify(arguments));
    const excludedSocket = await _getUserSocket(userId)
    if (!excludedSocket) {
        logger.debug('Shouldnt happen, socket not found')
        _printSockets();
        return;
    }
    logger.debug('broadcast to all but user: ', userId)
    if (room) {
        excludedSocket.broadcast.to(room).emit(type, data)
    } else {
        excludedSocket.broadcast.emit(type, data)
    }
}


module.exports = {
    connectSockets,
    emitTo,
    emitToUser,
    broadcast
};
