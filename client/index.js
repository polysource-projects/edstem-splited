// ==UserScript==
// @name         SplitED
// @namespace    violentmonkey
// @version      1.6
// @description  SplitED
// @author       violentmonkey
// @match        https://edstem.org/*
// @grant        none
// ==/UserScript==

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

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}


function createWs() {

    const ws = new WebSocket('wss://splited.polysource.ch');

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

            // wait until the page is completely loaded for the first update
            waitForElm('.disrep-actions-buttons').then(pageCheck);
        }
    }
    
    let currentPage = location.href;
    
    // listen for changes
    let interval = setInterval(function()
    {
        if (currentPage != location.href)
        {
            currentPage = location.href;
            waitForElm('.disrep-actions-buttons').then(pageCheck);
        }
    }, 500);
    
    function pageCheck () {
        console.log('Checking for claims...');
        const regex = /edstem.org\/eu\/courses\/([0-9]+)\/discussion\/([0-9]+)/;
        if (!regex.test(currentPage)) return;
        const match = currentPage.match(regex);
        if (!match) {
            console.log(window.location.href);
            return;
        }
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
            claimButton.textContent = `${claim.userDisplayName} répond`;
            claimButton.classList = 'ed-button ed-focus-outline ed-button-danger';
            claimButton.disabled = true;
        }
        else if (claim) {
            publishedButton.textContent = 'Publier';
            publishedButton.classList = 'ed-button ed-focus-outline ed-button-primary';
            claimButton.textContent = 'Je ne veux plus répondre';
            claimButton.classList = "ed-button ed-focus-outline ed-button-danger";
            claimButton.disabled = false;
        } else {
            publishedButton.textContent = 'Publier';
            publishedButton.classList = 'ed-button ed-focus-outline ed-button-primary';
            claimButton.textContent = 'Je veux répondre';
            claimButton.classList = "ed-button ed-focus-outline ed-button-primary";
            claimButton.disabled = false;
        }
    
        claimButton.onclick = function() {
            console.log('claiming thread');
            if (claimButton.textContent === 'Je veux répondre') {
                console.log('claiming');
                ws.send(JSON.stringify({
                    event: 'claim_thread',
                    data: {
                        threadId: parseInt(threadId),
                        userEmail: localStorage.getItem('lastEmail')
                    }
                }));
            }
            if (claimButton.textContent === 'Je ne veux plus répondre') {
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


    ws.onclose = function close() {
        console.log('disconnected');
        clearInterval(interval);
        createWs();
    }

}


createWs();
