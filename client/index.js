// ==UserScript==
// @name         SplitED
// @namespace    violentmonkey
// @version      1.9
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

    const claimDivSelector = '.dissholay-body > .discuss-reply .disrep-actions-buttons';
    const loggedElSelector = '#sprite-person';

    ws.onopen = function open() {
        ws.send(JSON.stringify({
            event: 'connected',
            data: localStorage.getItem('lastEmail')
        }));
    }
    let claims = [];
    let loggedIn = new Set();

    ws.onmessage = function incoming(event) {
        console.log('received', event.data?.length + 'claims');
        const data = JSON.parse(event.data);
        if (data.event === 'claims_update') {
            claims = data.data;
            console.log(data);
            waitForElm(claimDivSelector).then(claimCheck);
        }
        if (data.event === 'logged_in') {
            console.log('logged in', data.data);
            loggedIn = new Set(data.data);
            waitForElm(loggedElSelector).then(loggedCheck);
        }
    }
    
    let currentPage = location.href;
    
    // listen for changes
    let interval = setInterval(function()
    {
        if (currentPage != location.href)
        {
            currentPage = location.href;
            waitForElm(claimDivSelector).then(claimCheck);
            waitForElm(loggedElSelector).then(loggedCheck);
        }
    }, 500);
    
    function claimCheck () {
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
    
        const claimDiv = document.querySelector(claimDivSelector);
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

    function loggedCheck() {
        const regex = /edstem.org\/eu\/courses\/([0-9]+)\/discussion(\/([0-9]+))?/;
        if (!regex.test(currentPage)) return;

        const loggedInArr = Array.from(loggedIn).map(name => name);
        const loggedInStr = loggedInArr.slice(0, -1).join(', ')
            + (loggedIn.size > 1 ? " et " : "")
            + loggedInArr[loggedInArr.length - 1]
            + (loggedIn.size > 1 ? " sont" : " est")
            + " actuellement en ligne";

        const existingSpan = document.querySelector('#edstem-online');
        if (existingSpan) {
            existingSpan.textContent = loggedInStr;
        } else {

            const div = document.querySelector('.dsbc-online');
            const duplicatedDiv = div.cloneNode(true);
            duplicatedDiv.classList.add('edstem-online');
            duplicatedDiv.removeChild(duplicatedDiv.children[0]);
            duplicatedDiv.removeChild(duplicatedDiv.children[0]);
            /*const svgSpan = document.createElement('span');
            svgSpan.classList.add('dsbc-online-icon', 'icon', 'icon-person');
            const svg = document.createElement('svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'currentColor');
            // add path
            const path = document.createElement('path');
            path.setAttribute('d', 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z');
            svg.appendChild(path);
            svgSpan.appendChild(svg);
            duplicatedDiv.prepend(svgSpan);*/

            const insertingDiv = document.querySelector('.discuss-sidebar-container');
            insertingDiv.append(duplicatedDiv);

            const span = document.createElement('span');
            span.id = 'edstem-online';
            span.textContent = loggedInStr;
            document.querySelector('.edstem-online').append(span);
        }
    }

    waitForElm(loggedElSelector).then(loggedCheck);

    ws.onclose = function close() {
        console.log('disconnected');
        clearInterval(interval);
        createWs();
    }

}


createWs();
