let isAlreadyCalling = false;
let getCalled = false;

const existingCalls = [];

var peerConnectionConfig = {
    iceServers: [{
            urls: ["turn:173.194.72.127:19305?transport=udp",
                "turn:[2404:6800:4008:C01::7F]:19305?transport=udp",
                "turn:173.194.72.127:443?transport=tcp",
                "turn:[2404:6800:4008:C01::7F]:443?transport=tcp"
            ],
            username: "CKjCuLwFEgahxNRjuTAYzc/s6OMT",
            credential: "u1SQDR/SQsPQIxXNWQT7czc/G4c="
        },
        { urls: ["stun:stun.l.google.com:19302"] }
    ]
};

const { RTCPeerConnection, RTCSessionDescription } = window;

const peerConnection = new RTCPeerConnection(peerConnectionConfig);

let $loginBtn = document.querySelector('#sign-in-button');
let $username = document.querySelector('#txt_username');
let $contentContainer = document.querySelector('.content-container');
let $sidebarWrapper = document.querySelector('#sidebar-wrapper');
let $menuToggle = document.querySelector('#menu-toggle');
let $videoContainer = document.querySelector('.video-container');


let $loginform = document.querySelector('.loginpage');

$loginBtn.addEventListener('click', (event) => {
    setUserName($username.value);
    localStorage.setItem("username", $username.value);
    $loginform.style.display = "none";
});

jQuery(function($) {
    if (window.location.pathname == '/') {
        let $loginform = document.querySelector('.loginpage');
        if (localStorage.getItem('username')) {
            $loginform.style.display = "none";
            setUserName(localStorage.getItem('username'));
        };
    }
});


function setUserName(username) {
    console.log('user - ', username);
    socket.emit("add-user", {
        username
    });
}


function unselectUsersFromList() {
    const alreadySelectedUser = document.querySelectorAll(
        ".active-user.active-user--selected"
    );

    alreadySelectedUser.forEach(el => {
        el.setAttribute("class", "active-user");
    });
}

function createUserItemContainer(user) {
    const userContainerEl = document.createElement("div");

    userContainerEl.setAttribute("class", "active-user");
    userContainerEl.setAttribute("id", user.socketId);

    // inner div which contains picture and name of the user
    const userInnerContainer = document.createElement("div");

    //  paragraph
    const usernameEl = document.createElement("p");
    usernameEl.setAttribute("class", "username");
    usernameEl.innerHTML = `${user.username}`;

    userInnerContainer.appendChild(usernameEl);
    userContainerEl.appendChild(userInnerContainer);

    userContainerEl.addEventListener("click", () => {
        unselectUsersFromList();
        userContainerEl.setAttribute("class", "active-user active-user--selected");
        const talkingWithInfo = document.getElementById("talking-with-info");
        talkingWithInfo.innerHTML = `Talking with: "Socket: ${user.username}"`;
        callUser(user.socketId);
    });

    return userContainerEl;
}

async function callUser(socketId) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

    socket.emit("call-user", {
        offer,
        to: socketId
    });
}

function updateUserList(users) {
    const activeUserContainer = document.getElementById("active-user-container");
    activeUserContainer.innerHTML = "";
    users.forEach(user => {
        const userContainerEl = createUserItemContainer(user);
        activeUserContainer.appendChild(userContainerEl);
    });
}


function addUserList(users) {
    const activeUserContainer = document.getElementById("active-user-container");
    users.forEach(user => {
        const alreadyExistingUser = document.getElementById(user.socketId);
        if (!alreadyExistingUser) {
            const userContainerEl = createUserItemContainer(user);
            activeUserContainer.appendChild(userContainerEl);
        } else {
            alreadyExistingUser.innerHTML = user.username;
        }

    });
}

// const socket = io.connect("https://webchatbyraj.herokuapp.com");
// const socket = io.connect("http://localhost:1000/");
const socket = io.connect("https://appdevelopement.website/", {
    transports: ['polling']
});


socket.on("update-user-list", (users) => {
    updateUserList(users.users);
    $contentContainer.style.display = "block";
    $sidebarWrapper.style.display = "block";
    $menuToggle.style.display = "block";
    $videoContainer.style.display = "block";
});


socket.on("add-user-list", (users) => {
    addUserList(users.users);
    $contentContainer.style.display = "block";
    $sidebarWrapper.style.display = "block";
    $menuToggle.style.display = "block";
    $videoContainer.style.display = "block";
});


socket.on("remove-user", ({ socketId }) => {
    const elToRemove = document.getElementById(socketId);

    if (elToRemove) {
        elToRemove.remove();
    }
});

socket.on("call-made", async data => {
    if (getCalled) {
        const confirmed = confirm(
            `User "${data.socket}" wants to call you. Do accept this call?`
        );

        if (!confirmed) {
            socket.emit("reject-call", {
                from: data.socket
            });
            return;
        }
    }

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

    socket.emit("make-answer", {
        answer,
        to: data.socket
    });
    getCalled = true;
});

socket.on("answer-made", async data => {
    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
    );

    if (!isAlreadyCalling) {
        callUser(data.socket);
        isAlreadyCalling = true;
    }
});

socket.on("call-rejected", data => {
    alert(`User: "${data.socket}" rejected your call.`);
    unselectUsersFromList();
});

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.mediaDevices.getUserMedia;

peerConnection.ontrack = function({ streams: [stream] }) {
    const remoteVideo = document.getElementById("remote-video");
    if (remoteVideo) {
        remoteVideo.srcObject = stream;
    }
};

navigator.getUserMedia({ video: { width: { exact: 640 }, height: { exact: 480 } } },
    stream => {
        const localVideo = document.getElementById("local-video");
        if (localVideo) {
            localVideo.srcObject = stream;
        }

        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    },
    error => {
        // alert("You can't go further, please allow camera to go further")
        // window.location.replace("error")
    }
);