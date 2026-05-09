// ==UserScript==

// ----------------------------------- MetaData --------------------------------------

// @name        ABSidekick
// @author      WirlyWirly
// @version     0.5
// @homepage    https://github.com/WirlyWirly/ABSidekick
// @description Your sidekick for the AudioBookShelf web interface
//              Written on LibreWolf via Violentmonkey
//
// @namespace   UserScript
// @run-at      document-end

// ----------------------------------- Matches --------------------------------------

// If ABSidekick does not run automatically on your URL, edit this line with your actual Audiobookshelf URL and port
// @match       http://192.168.1.105:80/audiobookshelf/*

// @include     /https?://.+/audiobookshelf/.*/

// ----------------------------------- Dependencies --------------------------------------

// @require     https://raw.githubusercontent.com/WirlyWirly/UserScripts/main/HelperScripts/waitForElement.js
// @require     https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js

// ----------------------------------- Permissions --------------------------------------

// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_info
// @grant       GM_listValues
// @grant       GM_registerMenuCommand
// @grant       GM_setValue

// ----------------------------------- Script Links --------------------------------------

// @icon        https://raw.githubusercontent.com/WirlyWirly/ABSidekick/main/.github/assets/icon.webp?raw=true
// @updateURL   https://raw.githubusercontent.com/WirlyWirly/ABSidekick/main/ABSidekick.user.js?raw=true
// @downloadURL https://raw.githubusercontent.com/WirlyWirly/ABSidekick/main/ABSidekick.user.js?raw=true

// ==/UserScript==

// =================================== CODE ======================================

// The Audiobookshelf URL, which will be used when making API calls
let absURL = document.URL.match(/^(.+?\/audiobookshelf)\//)[1]

// Initialize the GM_config settings panel and retriever the master SETTINGS object
let SETTINGS = settingsPanel()

// The <div> element that will be used to display hover covers
let hoverCoverElement = document.createElement('div')
document.body.appendChild(hoverCoverElement)
hoverCoverElement.outerHTML = `<div id="hoverCoverContainer"><img src="" style="border-radius: 10px; max-height: 100%; max-width: 100%"></div>`

editPanelMain()

// Create the GM_config settings panel button in the #appbar
waitForElement('#appbar a[href="/audiobookshelf/config"]', document.body).then(function(element) {
    let settingsShortcut = document.createElement('div')
    element.insertAdjacentElement('afterend', settingsShortcut)
    settingsShortcut.id = 'gmConfigAppBar'
    settingsShortcut.innerText = '🛠️'
    settingsShortcut.title = 'Open the ABSidekick settings panel'
    settingsShortcut.addEventListener('click', function() {
        GM_config.open()
    })

})


// =================================== FUNCTIONS ======================================

async function editPanelMain() {

    // Observer the <body> child elements until the <div> of the edit panel [data-v-779b4e02] is loaded
    let modalOverlay = await waitForElement('body > div.modal[data-v-779b4e02]', document.body, false)
    let editPanel = await waitForElement('div.relative:has(#formWrapper)', modalOverlay)

    // Set identifiers for the edit panel and important elements
    modalOverlay.id = 'modalOverlay'
    modalOverlay.querySelector('div > h1').id = 'bookTitle'

    editPanel.id = 'editPanel'
    editPanel.querySelector('div[role="tablist"]').id = 'editPanelTabs'
    editPanel.querySelector('div.absolute[role="tablist"] :nth-child(1)').id = 'detailsTab'
    editPanel.querySelector('div.absolute[role="tablist"] :nth-child(2)').id = 'coverTab'
    editPanel.querySelector('div.absolute[role="tablist"] :nth-child(3)').id = 'chaptersTab'
    editPanel.querySelector('div.absolute[role="tablist"] :nth-child(4)').id = 'filesTab'
    editPanel.querySelector('div.absolute[role="tablist"] :nth-child(5)').id = 'matchTab'
    editPanel.querySelector('div.absolute[role="tablist"] :nth-child(6)').id = 'toolsTab'

    editPanel.querySelector('button[aria-label="Previous"]').id = 'navigateRight'
    editPanel.querySelector('button[aria-label="Next"]').id = 'navigateLeft'

    // -- MatchTab Observation ---
    let matchTabButton = editPanel.querySelector('#matchTab')
    matchTabButton.innerText = '🌱 Match'
    matchTabButton.addEventListener('click', async function(event) {
        // The match tab of the edit panel was clicked

        await waitForElement('#match-wrapper', editPanel)

        // Check if this match tab does not have a 'Title' button, indicating it needs a MutationObserver
        !editPanel.querySelector('#buttonTitle') ? matchTabObservation() : null

    })


}


async function matchTabObservation() {
    // Setup Mutation observation in the match tab and act on any new results

    let editPanel = document.querySelector('#editPanel')
    let matchTab = editPanel.querySelector('#match-wrapper')

    // Add identifiers to the various elements
    matchTab.querySelector(':nth-child(1)').id = 'searchForm'
    matchTab.querySelector('#searchForm input[placeholder="Search.."]').id = 'inputTitle'
    matchTab.querySelector('#searchForm input[placeholder="Search.."]').parentElement.previousElementSibling.id = 'labelInputTitle'
    matchTab.querySelector('#searchForm input[placeholder="Author"]').id = 'inputAuthor'
    matchTab.querySelector('#searchForm button[type="Submit"]').id = 'buttonSearch'
    matchTab.querySelector('div.matchListWrapper').id = 'resultsList'
    //matchTab.querySelector('#searchForm button[aria-label^="Provider"]').id = 'buttonProvider'

    // Create the GM_config settings shortcut
    let settingsShortcut = document.createElement('div')
    matchTab.appendChild(settingsShortcut)
    settingsShortcut.id = 'gmconfigShortcut'
    settingsShortcut.innerText = '🛠️'
    settingsShortcut.title = 'Open the ABSidekick settings panel'
    settingsShortcut.addEventListener('click', function() {
        GM_config.open()
    })

    // Create the 'Title' search button
    let titleSearchButton = document.createElement('button')
    titleSearchButton.id = 'buttonTitle'
    titleSearchButton.innerText = 'Title'
    titleSearchButton.setAttribute('class', 'abs-btn rounded-md shadow-md relative border border-gray-600 mt-5 ml-1 text-white bg-primary px-8 py-2')
    titleSearchButton.title = 'Fill the search field with the current title'
    matchTab.querySelector('form > div').appendChild(titleSearchButton)
    titleSearchButton.addEventListener('mouseup', function(event) {
        // The actions to take when the 'Title' button is clicked
        titleSearch()
    })

    // Create the 'AutoMatch' button
    let autoMatchButton = document.createElement('button')
    matchTab.querySelector('form > div').appendChild(autoMatchButton)
    autoMatchButton.id = 'buttonAutoMatch'
    autoMatchButton.setAttribute('class', 'abs-btn rounded-md shadow-md relative border border-gray-600 mt-5 ml-1 text-white bg-primary px-8 py-2')
    autoMatchButton.title = `Toggle AutoMatch\n\nℹ️ Confidence: >=${SETTINGS.autoMatchConfidence}%`
    SETTINGS.autoMatchEnabled == false ? autoMatchButton.innerText = `AutoMatch` : autoMatchButton.innerText = `🤖 AutoMatch`
    SETTINGS.autoMatchEnabled == true ? autoMatchButton.style.animation = 'pop .50s linear infinite alternate' : null

    autoMatchButton.addEventListener('click', function(event) {
        // The actions to take when the 'AutoMatch' button is clicked

        if ( SETTINGS.autoMatchEnabled == false ) {
            // Enable AutoMatch

            SETTINGS.autoMatchEnabled = true

            this.innerText = `🤖 AutoMatch`
            this.title = ''
            this.style.animation = 'pop .50s linear infinite alternate'

            if ( !document.getElementById('autoMatchCancel') ) {
                // The floating AutoMatchCancel button does not exists, so create it

                let autoMatchCancel = document.createElement('button')
                document.body.appendChild(autoMatchCancel)
                autoMatchCancel.outerHTML = `<button id="autoMatchCancel" title="AutoMatch is enabled, click to cancel" class="autoMatchCancel bg-primary rounded-md text-white">🤖 AutoMatch</button>`
                autoMatchCancel = document.getElementById('autoMatchCancel')

                autoMatchCancel.addEventListener('click', function(event) {
                    SETTINGS.autoMatchEnabled = false
                    this.remove()

                    document.getElementById('buttonAutoMatch') ? document.getElementById('buttonAutoMatch').innerText = `AutoMatch` : null
                    document.getElementById('buttonAutoMatch') ? document.getElementById('buttonAutoMatch').style.animation = '' : null
                    document.getElementById('autoMatchCancel') ? document.getElementById('autoMatchCancel').title = `Toggle AutoMatch, which will save the first match result that has a confidence score >=${SETTINGS.autoMatchConfidence}%` : null

                })
            }

            autoMatchStart(matchTab.querySelectorAll('#resultsList div.resultProcessed'))

        } else {
            // Disable Automatch

            SETTINGS.autoMatchEnabled = false

            this.innerText = `AutoMatch`
            this.title = `Toggle AutoMatch\n\nℹ️ Confidence: >=${SETTINGS.autoMatchConfidence}%`
            this.style.animation = ''

            document.getElementById('autoMatchCancel') ? document.getElementById('autoMatchCancel').remove() : null

        }
    })

    // When the edit panel is manually cycled, clean the match tab of old info
    editPanel.querySelector('#navigateRight').addEventListener('mouseup', () => { cleanMatchTab() } )
    editPanel.querySelector('#navigateLeft').addEventListener('mouseup', () => { cleanMatchTab() } )

    let observer = new MutationObserver(async function(mutations) {
        // Actions to take when there are changes in the match tab

        // Query for only the newly added match results
        let newMatchResults = matchTab.querySelectorAll('#resultsList > div > div.cursor-pointer:not(.resultProcessed)')

        if ( newMatchResults.length > 0  ) {
            // There are new match results, so process each item

            for ( let result of newMatchResults ) {
                // For each match, generate the new elements (buttons|coverDimensions)

                // Add classes\identifiers to the various elements in a match result
                result.classList.add('resultProcessed')
                result.parentElement.classList.add('resultContainer')

                result.querySelector(':nth-child(1)').classList.add('resultCover')
                result.querySelector('.resultCover img').classList.add('resultCoverImg')

                result.querySelector(':nth-child(2)').classList.add('resultMeta')
                result.querySelector('.resultMeta > :nth-child(1)').classList.add('resultTitle')
                result.querySelector('.resultMeta > :nth-child(2)').classList.add('resultDetails')
                try{ result.querySelector('.resultDetails div.rounded-full').classList.add('resultConfidence') } catch(error) {}
                try{ result.querySelector('.resultMeta > div:has( > div.rounded-full > p)').classList.add('resultSeries') } catch(error) {}
                result.querySelector('.resultMeta > div.overflow-hidden:has(> p)').classList.add('resultSynopsis')

                setTimeout(() => {

                    // After the images have a chance to load, create the Cover Dimensions label
                    let matchCover = result.querySelector('.resultCoverImg')
                    let dimensionsElement = document.createElement('div')
                    dimensionsElement.classList.add('resultCoverDimensions')
                    dimensionsElement.innerText = `${matchCover.naturalWidth} x ${matchCover.naturalHeight}`
                    matchCover.parentElement.insertAdjacentElement('afterend', dimensionsElement)

                    dimensionsElement.addEventListener('mouseenter', function(event) {
                        // Display the enlarged result cover
                        let { clientX, clientY } = event
                        viewHoverCover(this.parentElement.querySelector('.resultCoverImg').src, clientX, clientY)
                    })

                    dimensionsElement.addEventListener('mouseout', function(event) {
                        // Stop displaying the enlarged result cover
                        let hoverCoverElement = document.getElementById('hoverCoverContainer')
                        hoverCoverElement.classList.remove('active')
                    })

                }, 500)

                // The element that will contain the MatchMate buttons
                let buttonHolder = document.createElement('div')
                buttonHolder.classList.add('scriptButtons')

                // Save + Tag Button
                let saveTagButton = document.createElement('button')
                saveTagButton.innerText = `Save + 🏷️`
                saveTagButton.title = `Save this match result, add the custom tags, then continue to the next book\n\n🏷️ Tags: ${SETTINGS.saveTagsList}`
                saveTagButton.classList.add('saveResultTags', 'matchMateButton')
                saveTagButton.addEventListener('click', function(event) {

                    if ( SETTINGS.apiKey == '' ) {
                        window.alert('❌ ABSidekick ❌\n\nThis button requires a valid ApiKey\n\nProvide an ApiKey in the settings panel then try again')
                    } else {
                        observer.disconnect()
                        saveResult(this, SETTINGS.saveTagsList)
                    }

                })

                // Save Button
                let saveResultButton = document.createElement('button')
                saveResultButton.innerText = 'Save Match'
                saveResultButton.title = "Save this match result then continue to the next book\n\nℹ️ This is the same as clicking the 'Submit' button of the match result"
                saveResultButton.classList.add('saveResult', 'matchMateButton')
                saveResultButton.addEventListener('click', function(event) {
                    event.button == 0 ? saveResult(this) : null
                    observer.disconnect()
                })

                // Audible Button
                let asinButton = document.createElement('button')
                asinButton.innerText = 'Audible'
                asinButton.title = 'Open the Audible page of this match result\n\nℹ️ Only works if the match result has an ASIN'
                asinButton.classList.add('asinSearch', 'matchMateButton')
                asinButton.addEventListener('mouseup', function(event) {
                    event.button == 0 ? audibleLookup(this) : null
                })

                buttonHolder.appendChild(saveTagButton)
                buttonHolder.appendChild(saveResultButton)
                buttonHolder.appendChild(asinButton)

                result.parentElement.appendChild(buttonHolder)

            }

            // --- Use the first match result to get the currentId ---
            newMatchResults[0].click()

            // Wait until the submit button is available, indicating the form details are ready
            let submitButton = await waitForElement('button.bg-success[type="submit"]', matchTab)
            let coverURL = matchTab.querySelector('form img[src*="/api/items/"]').src
            SETTINGS.currentId = coverURL.match(/\/items\/(.+?)\//)[1]

            // Click the back arrow to return to match results
            let backArrowElement = matchTab.querySelector('div.cursor-pointer:has(> span.material-symbols')
            backArrowElement.click()

            // There is not a current cover image, so create one
            if ( !matchTab.querySelector('img.currentCover') ) {
                addBookData(SETTINGS.currentId)
            }

            // AutoMatch, if enabled and this is not the same item as previously saved
            if ( SETTINGS.autoMatchEnabled == true && SETTINGS.previousId != SETTINGS.currentId ) {
                // Check each result and save the first one with that has >= the user specified confidence percentile
                autoMatchStart(newMatchResults)
            }

        } else if ( matchTab.querySelector('#match-wrapper > :nth-child(3)').style.display != 'none' ) {
            // The 'No Results' notice is visible, which indicates that the search returned no match results

            // Update the 'No results' message
            matchTab.querySelector('#match-wrapper > :nth-Child(3) > p').outerHTML = `<p class="noResults">Oh 💩, no results! 😭</p>`

            let resultsList = document.getElementById('resultsList')
            let searchQuery = matchTab.querySelector('#inputTitle').value
            let bookTitle = document.getElementById('bookTitle').innerText


            // Make sure a title search has not already been readied, that there are 0 match results, and that the search term is not already the title
            if ( resultsList && !resultsList.classList.contains('titleSearchReady') && resultsList.childElementCount == 0 && searchQuery != bookTitle ) {

                // The title was not used to perform the search, so prepare a title search
                titleSearch()

                if ( SETTINGS.currentId && !matchTab.querySelector('img.currentCover') ) {
                    // There is a currentId available and there is not already a current cover
                    addBookData(SETTINGS.currentId)
                }
            }

        }

    })

    // Monitor the 'style=' property of #resultsList (.matchListWrapper), which changes between searches\navigations
    let target = matchTab.querySelector('#resultsList')
    let config = { childList: true , attributeFilter: ['style'] }
    observer.observe(target, config)

}


function addBookData(itemId) {
    // Add metadata of the provided book to the Match tab

    // The cover image
    let currentCoverElement = document.createElement('div')
    document.querySelector('#searchForm > div').firstChild.insertAdjacentElement('beforebegin', currentCoverElement)

    currentCoverElement.title = 'The current cover for this book'
    currentCoverElement.classList.add('currentCover')
    currentCoverElement.innerHTML = `<img class="currentCover" src="${absURL}/api/items/${itemId}/cover?&raw=1">`

    currentCoverElement.addEventListener('mouseenter', function(event) {
        let { clientX, clientY } = event
        viewHoverCover(this.parentElement.querySelector('img').src, clientX, clientY)
    })

    currentCoverElement.addEventListener('mouseout', function(event) {
        let hoverCoverElement = document.getElementById('hoverCoverContainer')
        hoverCoverElement.classList.remove('active')
    })

}


function cleanMatchTab() {
    // Clean the match tab of book-specific changes

    let matchTab = document.getElementById('match-wrapper')

    SETTINGS.previousId = SETTINGS.currentId
    SETTINGS.currentId = ''

    if ( matchTab ) {
        // Remove a previous cover image if present
        matchTab.querySelectorAll('div.currentCover').forEach((element) => { element.remove() })

        // Remove 'Title' search styling and indicators
        let labelTitle = matchTab.querySelector('#labelInputTitle')
        if ( labelTitle.classList.contains('titleSearchReady') ) {
            labelTitle.innerText = 'Search Title or ASIN'
            labelTitle.classList.remove('titleSearchReady')
            matchTab.querySelector('#resultsList').classList.remove('titleSearchReady')
        }

    }

}


async function titleSearch() {
    // The 'Title' search button of the match tab was clicked or there were no results during the search

    // The <h1> element at the top of the screen, which displays the title of the current book
    let bookTitle = document.getElementById('bookTitle').innerText

    // Update the search field of the Match tab and click the search button
    let matchTab = document.getElementById('match-wrapper')
    let titleField = matchTab.querySelector('#inputTitle')
    titleField.value = bookTitle

    // Update the Search field label
    matchTab.querySelector('#labelInputTitle').innerText = '📖 No Results? Try a title search! Just add a space then hit Search!'
    matchTab.querySelector('#labelInputTitle').classList.add('titleSearchReady')

    // Add a class to indicate that a title search has already been readied
    matchTab.querySelector('#resultsList').classList.add('titleSearchReady')

    // -- NOT WORKING --
    matchTab.querySelector('#buttonSearch').click()

}


function autoMatchStart(matchResults) {
    // Enable and then AutoMatch for a match entry among the provided array

    for ( let result of matchResults ) {

        // The element containing the confidence percentile
        let confidenceElement = result.querySelector('div.resultConfidence')

        if ( confidenceElement ) {
            // The confidence element was found, so determine if it passes the check

            let confidenceScore = confidenceElement.innerText.match(/(\d+)%/)[1]

            if ( confidenceScore >= SETTINGS.autoMatchConfidence ) {
                // This match result has met or exceeded the confidence threshold, so prepare to save it
                result.parentElement.classList.add('autoMatchSelection')

                setTimeout(() => {

                    if ( SETTINGS.autoMatchEnabled == true ) {
                        // The AutoMatch was not cancelled, so continue with the save
                        try{ observer.disconnect() } catch(error) {}
                        let targetButton = SETTINGS.autoMatchTarget == 'Save Match' ? 'saveResult' : 'saveResultTags'
                        result.parentElement.querySelector(`button.${targetButton}`).click()
                    }

                }, SETTINGS.autoMatchDelay)

                break

            }

        }

    }

}

function viewHoverCover(imgURL, clientX, clientY) {

    let hoverCoverElement = document.getElementById('hoverCoverContainer')
    hoverCoverElement.querySelector('img').src = imgURL
    hoverCoverElement.classList.add('active')

    let positionY =
      clientY + hoverCoverElement.scrollHeight >= window.innerHeight
        ? window.innerHeight - hoverCoverElement.scrollHeight - 20
        : clientY + 20;
    let positionX =
      clientX + hoverCoverElement.scrollWidth >= window.innerWidth
        ? window.innerWidth - hoverCoverElement.scrollWidth - 20
        : clientX + 20;

    hoverCoverElement.style.top = `${positionY}px`
    hoverCoverElement.style.left = `${positionX}px`

}


// @saveResult
async function saveResult(matchButton, additionalTags = false) {
    // The 'Save' button of a bookResult was clicked

    // The floating Edit panel
    let editPanel = document.getElementById('editPanel')

    // Click the book item, which will load the new data
    matchButton.closest('div.resultContainer').querySelector('div.resultProcessed').click()

    // Wait until the submit button is available, then click it
    let submitButton = await waitForElement('button.bg-success[type="submit"]', editPanel.querySelector('#match-wrapper'))

    // From the current cover, get the id of the book that is about to be saved
    let coverURL = editPanel.querySelector('img[src*="/api/items/"]').src
    SETTINGS.previousId = coverURL.match(/\/items\/(.+?)\//)[1]

    // Click the green 'Submit' button to update this book with the metadata of the selected match result
    submitButton.click()

    // Wait until the details tab is ready, indicating the match has been saved
    await waitForElement('#formWrapper', editPanel)

    // API: Additional tag(s)
    if ( additionalTags ) {

        // GET the newly saved tags
        let response = await fetch(`${absURL}/api/items/${SETTINGS.previousId}?token=${SETTINGS.apiKey}`, {
            headers: { 'Authorization': `Bearer ${SETTINGS.apiKey}` }
        })

        let metadata = await response.json()
        let currentTags = metadata.media.tags

        // PATCH the new + custom tags
        fetch(`${absURL}/api/items/${SETTINGS.previousId}/media`, {
            method: 'PATCH',
            body: JSON.stringify({ tags: currentTags.concat(additionalTags) }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SETTINGS.apiKey}`
            },
        })

    }

    if ( SETTINGS.navigationDirection != 'None' ) {
        // If enabled, cycle the match tab to the previous\next book

        let titleHeader = document.querySelector('#bookTitle').childNodes[0]

        let titleObserver = new MutationObserver(async function(mutations) {

            // The <h1> title has changed, indicating that the next book has been cycled
            if ( mutations[0].oldValue != mutations[0].target.nodeValue ) {
                titleObserver.disconnect()

                // Get the id of the newly loaded book
                editPanel.querySelector('#coverTab').click()
                let coverURL = await waitForElement('img[src*="/api/items/"]', editPanel)
                SETTINGS.currentId = coverURL.src.match(/\/items\/(.+?)\//)[1]

                // Click on the Match tab, which has a 'click' event listener that will begin observation
                editPanel.querySelector('#matchTab').click()

            }

        })

        titleObserver.observe(titleHeader, { characterData: true, characterDataOldValue: true })

        SETTINGS.navigationDirection == 'Right' ? editPanel.querySelector('#navigateRight').click() : null
        SETTINGS.navigationDirection == 'Left' ? editPanel.querySelector('#navigateLeft').click() : null

    }

}


async function audibleLookup(asinButton) {
    // The 'Audible' lookup button was clicked

    // The floating Edit panel
    let editPanel = document.getElementById('editPanel')

    // Click the book item, which will load the form data
    asinButton.closest('div.resultContainer').querySelector('div.resultProcessed').click()

    // Wait until the submit button is available, indicating the form is available, then get the ASIN
    let submitButton = await waitForElement('button.bg-success[type="submit"]', editPanel.querySelector('#match-wrapper'))

    let asinURL
    try {
        let asinValue = editPanel.querySelector('#match-wrapper input[placeholder="ASIN"]').value
        asinURL = SETTINGS.audibleTemplate.replace(/%asin%/, asinValue)
    } catch(error) {}

    // Click the back arrow to return to match results
    let backArrowElement = editPanel.querySelector('div.cursor-pointer:has(> span.material-symbols')
    backArrowElement.click()

    asinURL ? window.open(asinURL, '_blank') : asinButton.innerText = 'No ASIN'

}


// =================================== GM_CONFIG ======================================

function settingsPanel() {
    let configFrame = document.createElement('div')
    document.body.appendChild(configFrame)
    let reloadWindow

    // @GM_config
    GM_config.init({
        'id': 'abSidekick',
        'frame': configFrame,
        'title': `
            <a id="absidekickHeader" href="${GM_info.script.homepage}" target="_blank">🌱 ABSidekick</a><br>
            <div>★ Hover over emojis for details ★</div>
        `,

        'fields': {

            'autoMatchConfidence': {
                'label': '🤖 Confidence Score',
                'type': 'int',
                'default': '100',
                'title': 'When AutoMatch is enabled, the first match result with AT-LEAST this confidence score will be the one that is selected and then saved'
            },

            'autoMatchDelay': {
                'label': '🕓 Save Delay',
                'type': 'int',
                'default': '2500',
                'title': 'The delay in milliseconds between when AutoMatch selects a match result and when the save button is clicked\n\nℹ️ A longer delay will give you more time to verify the match and intervene if desired'
            },

            'autoMatchTarget': {
                'label': '🎯 Target Button',
                'type': 'select',
                'options': ['Save Match', 'Save + 🏷️'],
                'default': 'Save + 🏷️',
                'title': 'When AutoMatch has selected a match result to save, this is the button that will be clicked to perform the save'
            },

            'currentCoverHeight': {
                'label': '🖼️ Current Cover Height',
                'type': 'text',
                'default': '75px',
                'title': 'The maximum height of the current cover that is displayed above the match results'
            },

            'matchCoverHeight': {
                'label': '🖼️ Match Cover Height',
                'type': 'text',
                'default': '192px',
                'title': 'The maximum height of the cover displayed by each match result'
            },

            'hoverCoverHeight': {
                'label': '🖼️ Hover Cover Height',
                'type': 'text',
                'default': '700px',
                'title': 'The maximum height of a cover when it is hovered over and enlarged'
            },

            'matchPanelColumns': {
                'label': '🧇 Columns',
                'type': 'int',
                'default': '2',
                'title': 'The number of grid columns that will be used to display the match results'
            },

            'matchPanelWidth': {
                'label': '↔️ Width',
                'type': 'text',
                'default': '1200px',
                'title': 'The width of the edit panel when the Match tab is active'
            },

            'matchPanelHeight': {
                'label': '↕️ Height',
                'type': 'text',
                'default': '80%',
                'title': 'The height of the edit panel when the Match tab is active'
            },

            'navigationDirection': {
                'label': '🧭 Navigation Direction',
                'type': 'select',
                'options': ['Right', 'Left', 'None'],
                'default': 'Right',
                'title': 'The directional button (arrow) that will be clicked after a match result is saved'
            },

            'customFont': {
                'label': '✏️ Roboto Condensed',
                'type': 'select',
                'options': ['Everywhere', 'EditPanel', 'Off'],
                'default': 'Everywhere',
                'title': 'Set Roboto Condensed as the default font'
            },

            'saveTagsList': {
                'label': '🏷️ SaveTags List',
                'type': 'text',
                'default': '',
                'title': "A comma seperated list of tags that will be applied to the book when clicking the 'Save + 🏷️' button\n\nℹ️ Setting a unique tag is a simple way to distinguish books that have already been matched, either for simple record keeping or for future scripting"
            },

            'apiKey': {
                'label': '🔑 ApiKey',
                'type': 'text',
                'default': '',
                'title': 'A valid AudioBookShelf ApiKey'
            },

            'audibleTemplate': {
                'label': '🔎 Audible Template',
                'type': 'text',
                'default': 'https://www.audible.com/pd/%asin%',
                'title': "The search template URL that will be used when clicking the 'Audible' button\n\nℹ️ The %asin% placeholder will be replaced with the actual ASIN of the match result"
            },

        },
        'events': {
            'open': function() {
                reloadWindow = false

                // Create Section Headers
                function settingsHeader(text, beforeElement) {
                    let element = document.createElement('div')
                    element.innerText = text
                    element.classList.add('settingsHeader')
                    beforeElement.insertAdjacentElement('beforebegin', element)
                }

                settingsHeader('AutoMatch', document.querySelector('#abSidekick_autoMatchConfidence_var'))
                settingsHeader('Cover Images', document.querySelector('#abSidekick_currentCoverHeight_var'))
                settingsHeader('Match Panel', document.querySelector('#abSidekick_matchPanelColumns_var'))
                settingsHeader('Other', document.querySelector('#abSidekick_navigationDirection_var'))

                // Obfuscate apiKey input
                let apiKeyElement = document.getElementById('abSidekick_field_apiKey')
                apiKeyElement.placeholder = 'abc123'
                apiKeyElement.type = 'password'
                apiKeyElement.addEventListener('focus', function() { this.type = 'text' })
                apiKeyElement.addEventListener('blur', function() { this.type = 'password' })

                // Save Tags placeholder
                document.getElementById('abSidekick_field_saveTagsList').placeholder = 'ABSidekick, Matched'

            },
            'save': function () {
                // Actions to take when the 'Save' button is clicked
                document.getElementById('abSidekick_saveBtn').innerText = '👍 Saved!'
                reloadWindow = true

                // Clear cached data when settings are saved
                GM_listValues().forEach(key => {
                    if (key !== 'abSidekick') {
                        GM_setValue(key, null)
                    }
                })

            },
            'close': function () {
                // Actions to take when the 'Close' button is clicked
                if (reloadWindow) {
                    if (this.frame) {
                        window.location.reload()
                    } else {
                        setTimeout(() => {
                            window.location.reload()
                        }, 250)
                    }
                }
            },
            'reset': function () {
                // Actions to take when the 'Reset' button is clicked
                if (typeof resetToDefaults === 'function') {
                    resetToDefaults()
                }
            }
        }
    })

    // Register the settings panel to be opened from the UserScript manager dialouge
    GM_registerMenuCommand('🛠️ Settings', () => {
        GM_config.open()
    })

    // @SETTINGS
    // Get the saved GM_config settings
    let SETTINGS = {
        currentId: '',
        previousId: '',
        autoMatchEnabled: false,
        metadata: {
            asin: '',
            author: '',
            isbn: '',
            narrator: '',
            publisher: '',
            subtitle: '',
            title: '',
            year: '',
        },

        autoMatchConfidence: GM_config.get('autoMatchConfidence'),
        autoMatchDelay: GM_config.get('autoMatchDelay'),
        autoMatchTarget: GM_config.get('autoMatchTarget'),

        currentCoverHeight: GM_config.get('currentCoverHeight'),
        matchCoverHeight: GM_config.get('matchCoverHeight'),
        hoverCoverHeight: GM_config.get('hoverCoverHeight'),

        matchPanelColumns: GM_config.get('matchPanelColumns'),
        matchPanelHeight: GM_config.get('matchPanelHeight'),
        matchPanelWidth: GM_config.get('matchPanelWidth'),

        navigationDirection: GM_config.get('navigationDirection'),
        customFont: GM_config.get('customFont'),
        saveTagsList: GM_config.get('saveTagsList').split(','),
        apiKey: GM_config.get('apiKey'),
        audibleTemplate: GM_config.get('audibleTemplate'),
    }

    return SETTINGS

}


// =================================== Styling ======================================

// Global styling
GM_addStyle(`

@import url('https://fonts.googleapis.com/css2?family=Lilita+One&family=Roboto+Condensed:wght@500&display=swap');

    /* ---------- AppBar ---------- */

    #gmConfigAppBar {
        cursor: pointer;
        font-size: 1.2rem;
        margin: .25rem;
    }

    /* ---------- Animations ---------- */

    @keyframes blinker {

        50% {
            opacity: .2;
        }

    }

    @keyframes textglow {

        0% {
            text-shadow: 0px 0px 5px #2078b9;
        }

        100% {
            text-shadow: 0px 0px 20px #2078b9;
        }

    }

    @keyframes pop {

        0% {
            transform: scale(1.1);
            -webkit-transform: scale(1.1);
        }

        100% {
            transform: scale(0.90);
            -webkit-transform: scale(0.90);
        }

    }

    /* ---------- Headers ---------- */

    ${SETTINGS.customFont == 'Everywhere' ? `
    *:not(.material-symbols) {
        font-family: Roboto Condensed;
    }` : '' }

`)


// GM_config panel styling
GM_addStyle(`

    #abSidekick * {
        font-family: 'Roboto Condensed', arial, tahoma !important;
    }

    #abSidekick {
        backdrop-filter: blur(9px) !important;
        background: #191d2aa3 !important;
        border-radius: 10px !important;
        border: 1px solid #2C3E50 !important;
        box-shadow: 0px 0px 15px #2C3E50 !important;
        color: #ffffff !important;
        height: auto !important;
        inset: 15px 30px auto auto !important;
        line-height: 22px !important;
        margin: 0 !important;
        overflow: auto scroll !important;
        padding: 0px 0px !important;
        position: fixed !important;
        width: 375px !important;
        scrollbar-width: none;
    }

    div#abSidekick_header {
        margin: 20px 0px 10px 0px !important;
    }

    #abSidekick_header > a {
        text-decoration: none;
        user-select: none;
        text-shadow: 0 0 20px #2078b9;
        font-size: 2rem;
        font-family: 'Lilita One' !important;
        animation: textglow .5s linear infinite alternate;
    }

    #abSidekick_header > div {
        color: #95a5a6;
        display: block;
        font-size: .9rem;
        margin: 5px 0px 0px 0px;

    }

    #abSidekick div.settingsHeader {
        border-bottom: 2px solid #2C3E50;
        border-top: 2px solid #2C3E50;
        cursor: default;
        display: flex;
        font-family: 'Lilita One' !important;
        font-size: 1.2rem;
        justify-content: center;
        margin: 12px auto 8px auto;
        text-shadow: 0px 0px 10px #2078b9;
    }

    #abSidekick div.config_var {
        margin: 0px 0px 10px 0px;
    }

    #abSidekick label.field_label {
        color: rgba(255, 255, 255, 0.9);
        font-size: 1rem;
        font-weight: 500;
        margin: 0px 0px 0px 20px;

    }
    #abSidekick input[type="text"], #abSidekick input[type="password"], #abSidekick input[type="checkbox"], #abSidekick select {
        /* Text Fields */
        background: rgba(255, 255, 255, 0.9);
        border-radius: 3px;
        border: 1px solid #ddd;
        color: #191d2a;
        font-size: .9rem;
        font-weight: 500;
        margin: 0px 20px 0 0px;
        position: fixed;
        right: 0px;
        text-align: center;
        transition: all 0.3s ease;
        width: 100px;
    }

    #abSidekick input[type="checkbox"] {
        height: 1rem;
    }

    #abSidekick select {
        padding: 4px;
    }

    #abSidekick #abSidekick_field_saveTagsList,
    #abSidekick #abSidekick_field_apiKey,
    #abSidekick #abSidekick_field_audibleTemplate {
        width: 155px;
    }

    #abSidekick_buttons_holder {
        margin: 12px auto auto auto;
        border-top: 2px solid #2C3E50;
        display: grid;
        padding: 10px 0px 0px 0px;
    }

    button.saveclose_buttons {
        background-color: #2C3E50;
        border-radius: 5px;
        border: none;
        box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
        color: #FFFFFF;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
        margin: 15px auto 0px auto !important;
        padding: 2px 12px !important;
        width: 50%;
    }

    button.saveclose_buttons:hover {
        background-color: #3a4a5b;
        animation: pop .50s linear infinite alternate;
    }

    #abSidekick div.reset_holder {
        margin: 10px 20px 20px 0px;
    }

    #abSidekick a.reset {
        color: #95a5a6;
    }

    #abSidekick a.reset:hover {
        animation: blinker 1s linear infinite;
    }
`)


// MatchMate styling
GM_addStyle(`

    #appbar h1,
    #bookTitle {
        color: #efefef;
        font-family: 'Lilita One';
        font-size: 2rem;
        text-shadow: 0px 0px 15px #000000;
    }

    /* ---------- Edit Panel ---------- */

    #editPanel:has(#match-wrapper) {
        /* edit panel size */
        height: ${SETTINGS.matchPanelHeight} !important;
        width: ${SETTINGS.matchPanelWidth} !important;
    }

    #editPanel #matchTab {
        font-family: 'Lilita One', 'Roboto Condensed';
        font-weight: 400,

    }

    ${SETTINGS.customFont == 'EditPanel' ? `
    #editPanel *:not(.material-symbols) {
        font-family: 'Roboto Condensed';
    }` : '' }

    /* ---------- Search Bar Row ---------- */

    #gmconfigShortcut {
        cursor: pointer;
        font-size: 1rem;
        position: absolute;
        right: 5px;
        top: 5px;
    }

    div.currentCover {
        /* current cover size */
        max-height: ${SETTINGS.currentCoverHeight};
        box-shadow: 0px 0px 10px #000000;
        margin-right: 10px;
        margin-top: -12px;
        border-radius: 3px;
    }

    img.currentCover {
        /* current cover size */
        max-height: inherit;
        max-width: inherit;
        border-radius: 3px;
        border: 1px solid #000000;
    }

    div:has(> div.currentCover) {
        /* search bar vertical item alignment */
        align-items: end;
    }

    #labelInputTitle.titleSearchReady {
        text-shadow: 0px 0px 8px rgb(22, 84, 0);
        animation: blinker 1s linear infinite;
    }

    #match-wrapper form div:has( > div > div > input[placeholder="Author"]) {
        /* search author size */
        width: 110px;
    }

    /* ---------- Match Results Grid ---------- */

    div.matchListWrapper {
        /* MatchTab grid view */
        display: grid;
        grid-template-columns: repeat(${SETTINGS.matchPanelColumns}, auto);
        height: unset;
        max-height: calc(100% - 80px);
        scrollbar-color: #7a7a7a #0000;
        scrollbar-width: thin;
        padding: 0px 5px 0px 0px;
        gap: 5px;
    }

    .noResults {
        font-size: 1.5rem;
        animation: pop .50s linear infinite alternate;
    }

    .resultContainer {
        border: none;
        padding: 2px 0px 0.5rem 2px;
    }

    .resultCover {
        /* match cover size */
        height: unset;
        max-height: ${SETTINGS.matchCoverHeight};
        max-width: ${SETTINGS.matchCoverHeight};
        border-radius: 5px;
        min-width: unset;
        position: relative;
        width: unset;
        box-shadow: 0px 0px 10px #000000;
        margin: 0px 0px 0px 5px;

    }

    .resultCoverImg {
        border-radius: 5px;
        border: 1px solid #000000;
    }

    .resultCoverDimensions {
        /* cover dimensions */
        background: #0000006e;
        border-radius: 25px;
        font-size: x-small;
        left: 3px;
        padding: 1px 7px;
        position: absolute;
        top: 5px;
        width: fit-content;
    }

    .resultMeta {
        /* match metadata size */
        width: fit-content;
        max-height: ${SETTINGS.matchCoverHeight};
        overflow: auto;
        scrollbar-width: thin;
        scrollbar-color: #555 #0000;
    }

    .resultTitle h1 {
        /* match titles */
        font-weight: 600;
        font-size: 1.1rem;
        text-shadow: 0px 0px 10px #000000;
    }

    .resultSeries > div.rounded-full {
        /* match series */
        background-color: #00000080;
    }

    .resultSeries p {
        /* match series */
        color: white;
        font-size: .8rem;
        padding: 3px 5px 3px 5px;
    }

    .resultSynopsis {
        /* match synopsis size */
        max-height: 100%;
        overflow: initial;
    }

    div.bg-success\\\/80 {
        box-shadow: 0px 0px 15px #48974b;
        border: 1px solid #FFFFFF;
        animation: blinker .75s linear infinite;

    }

    /* ---------- MatchMate Buttons ---------- */

    div.scriptButtons {
        display: grid;
        grid-template-columns: repeat(3, auto);
        margin: 5px 15px 5px 3px;
        gap: 15px;
    }

    button.matchMateButton {
        /* matchMate Button sizes */
        border-radius: var(--radius-md);
        border: none;
        cursor: pointer;
        font-size: medium;
        padding: 3px;
        width: unset;
    }

    button.saveResult {
        background-color: #153245;
        border: #B6D3E7 solid 1px;
        color: #B6D3E7;
    }

    button.saveResult:hover {
        background-color: #224f6d;
    }

    button.saveResultTags {
        background-color: #113400;
        border: #A0DA83 solid 1px;
        color: #A0DA83;
    }

    button.saveResultTags:hover {
        background-color: #1d5900;
    }

    button.asinSearch {
        background-color: #431C00;
        color: #F09D63;
        border: #F09D63 solid 1px;
    }

    button.asinSearch:hover {
        background-color: #7C3400;
    }

    /* ---------- Enlarged Cover Hover ---------- */

    #hoverCoverContainer {
        display: none;
    }

    #hoverCoverContainer.active {
        /* enlarged img panel */
        border-radius: 10px;
        box-shadow: 0px 0px 20px #000000;
        border: 1px solid black;
        display: unset;
        max-height: ${SETTINGS.hoverCoverHeight};
        max-width: ${SETTINGS.hoverCoverHeight};
        position: fixed;
        z-index: 999;
    }

    /* ---------- AutoMatch ---------- */

    .autoMatchSelection {
        border-radius: 6px;
        background-color: rgba(93, 175, 76, 0.46);
        box-shadow: 0px 0px 5px rgba(93, 175, 76, 0.46);
    }

    .autoMatchSelection .resultDetails p,
    .autoMatchSelection .resultSynopsis p {
        color: var(--color-gray-300);
    }

    button.autoMatchCancel {
        border: 1px solid #4A5565;
        bottom: 5%;
        box-shadow: 0px 0px 10px #4A5565;
        cursor: pointer;
        left: 5%;
        padding: 15px 30px 15px 30px;
        position: fixed;
        z-index: 9999;
        animation: pop .50s linear infinite alternate;
    }

    button.autoMatchCancel:hover {
        background-color: #393939;
    }

`)
