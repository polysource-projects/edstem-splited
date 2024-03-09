// ==UserScript==
// @name         4chan X
// @namespace    4chan-x
// @version      1
// @description  4chan X
// @author       violentmonkey
// @match        https://edstem.org/*
// @grant        none
// ==/UserScript==

console.log('coucou');
console.log('test');
console.log('test2');

function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

const ws = new WebSocket('ws://localhost:3000');

ws.onopen = function open() {
    ws.send(JSON.stringify({
        event: 'connected',
        data: localStorage.getItem('lastEmail')
    }));
}


let claims = [];

ws.onmessage = function incoming(event) {
    console.log('received', event.data);
    const data = JSON.parse(event.data);
    if (data.event === 'claims_update') {
        claims = data.data;
        console.log(data);
        pageCheck();
    }
}

let lastPageUrl = window.location.href;

let currentPage = location.href;

const pageCheck = () => {
    console.log('Checking for claims...');
    const regex = /edstem.org\/eu\/courses\/([0-9]+)\/discussion\/([0-9]+)/;
    const match = currentPage.match(regex);
    const courseId = match[1];
    const threadId = match[2];
    console.log(`Course ID: ${courseId}, Thread ID: ${threadId}`);
    const claim = claims.find(claim => claim.threadId === parseInt(threadId));
    console.log(claim);

    const claimDiv = document.querySelector('.disrep-actions-buttons');
    if (!claimDiv) return console.log('No claimDiv found');
    const publishedButton = claimDiv.children.length == 2 ? claimDiv.children[1] : claimDiv.children[0];
    publishedButton.id = 'pbt';
    let claimButton = claimDiv.children.length == 2 ? claimDiv.children[0] : null;
    if (!claimButton) {
        claimButton = document.createElement('button');
        claimDiv.prepend(claimButton);
    }

    if (claim && claim.userEmail !== localStorage.getItem('lastEmail')) {
        publishedButton.textContent = 'Publier tout de même';
        publishedButton.classList = 'ed-button ed-focus-outline ed-button-danger';
        claimButton.textContent = `Claimed by ${claim.userDisplayName}`;
        claimButton.classList = 'ed-button ed-focus-outline ed-button-danger';
        claimButton.disabled = true;
    }
    else if (claim) {
        publishedButton.textContent = 'Publier';
        publishedButton.classList = 'ed-button ed-focus-outline ed-button-primary';
        claimButton.textContent = 'Annuler le claim';
        claimButton.classList = "ed-button ed-focus-outline ed-button-danger";
        claimButton.disabled = false;
    } else {
        publishedButton.textContent = 'Publier';
        publishedButton.classList = 'ed-button ed-focus-outline ed-button-primary';
        claimButton.textContent = 'Claim';
        claimButton.classList = "ed-button ed-focus-outline ed-button-primary";
        claimButton.disabled = false;
    }

    claimButton.onclick = function() {
        console.log('claiming thread');
        if (claimButton.textContent === 'Claim') {
            console.log('claiming');
            ws.send(JSON.stringify({
                event: 'claim_thread',
                data: {
                    threadId: parseInt(threadId),
                    userEmail: localStorage.getItem('lastEmail')
                }
            }));
        }
        if (claimButton.textContent === 'Annuler le claim') {
            console.log('unclaiming');
            ws.send(JSON.stringify({
                event: 'unclaim_thread',
                data: {
                    threadId: parseInt(threadId),
                    userEmail: localStorage.getItem('lastEmail')
                }
            }));
        }
    }
}

// when the page is COMPLETELY loaded
waitForElm('.disrep-actions-buttons').then((elm) => {
    pageCheck();
});

// listen for changes
setInterval(function()
{
    if (currentPage != location.href)
    {
        currentPage = location.href;
        pageCheck();
    }
}, 500);
  
