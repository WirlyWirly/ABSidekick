# 🌱 ABSidekick
<div align="center">
  <img src=".github/assets/preview.png" alt="absidekick" width="100%" />
</div><br>

This [UserScript](https://openuserjs.org/about/Userscript-Beginners-HOWTO) will add additional features\functionality directly into the [AudioBookshelf](https://www.audiobookshelf.org/) web interface.

Adding new features through a **UserScript** means that anyone can have simple access to this custom functionality, without having to wait for the feature to be officially implemented by Audiobookshelf.

There are customizable settings that can be configured through the **ABSidekick Settings Panel**, which can be accessed by clicking the  `🛠️` emoji in the Audiobookshelf AppBar.

## Match Tab
A suite of additional features to dramatically speed up your matching and allow for a more automated approach

* `Save Match` button: Save the selected match result (like clicking the `Submit` button) and then cycle to the next book in the list
* `Save + Tag` button: Save the selected match result (like clicking the `Submit` button), add custom tag(s), and then cycle to the next book in the list
* `Audible` button: Using the *ASIN* of the match result, open a new tab to its *Audible* page
* `Title` button: Quickly fill the search field with the current title of the book, useful when the auto-populated *ASIN* search returns *No Results*
* `AutoMatch` button: Automatically select and save the first match that has a minimum confidence percentile, which can be specified in the settings panel
* **Grid View**: The match results will be displayed in a grid view, allowing you to see more of them at once
* **Current Cover**: The current cover of the book will be displayed above the match results, which serves as a visual reference to help you in quickly selecting the correct match result
* **Hover Covers**: Hover your mouse over cover images to quickly enlarge them for detailed viewing
* Auto `Title` fill: If the initial *ASIN* search returns *No Results*, the title will be automatically populated into the search field, the same as when clicking the `Title` button.

## Install
ABSidekick is a **UserScript**, which means it is **JavaScript** code that get executed by a **UserScript Manager**. A *UserScript Manager* is a browser addon, who's purpose is to run these *UserScripts* when you visit a site they are programmed to operate on. You can can find and install a *UserScript Manager* addon from your browsers web store...

> **Violentmonkey**:
[Firefox](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/) | 
[Chrome](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) | 
[Edge](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjdenkkddmbclomhiblgggliao)<br>
> **Tampermonkey**:
[Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) | 
[Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
[Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
[Safari](https://apps.apple.com/us/app/tampermonkey/id6738342400)

If you are not sure which *UserScript Manager* to install, the one I would recommend above all others is [Violentmonkey](https://violentmonkey.github.io/), both for its fantastice development team and open-source nature. If Violentmonkey is not available to you, my next recommendation would be [Tampermonkey](https://www.tampermonkey.net/), which is more widely available but is not open-source.

Once you have installed a *UserScript Manager* addon to your browser, simply click the **Install** link below and the manager will prompt you to install *ABSidekick*. After it has been installed, you will immediately start seeing the changes made by *ABSidekick* whenever you visit the Audiobookshelf web interface! 🥳

ℹ️ When you first open the Audiobookshelf web interface, abs will add the `/audiobookshelf/` part to your the **URL** if you did not include it. *ABSidekick* will **not** run automatically unless the URL **already** contains the  `/audiobookshelf/` part without abs needing to add it. So to fix this, you can simply add the `/audiobookshelf/` part to your bookmark, that way whenever you open the bookmark, abs doesn't need to add it for you because you are already opening the full URL.

ℹ️ If **ABSidekick** does not run automatically for you, then you will need to edit the `@match` line near the top of the script so that it points to your actual `ip:port`. Be aware that **ABSidekick** is configured to recieve auto-updates, so any edits you make to the script directly will be overwritten by future updates

⚠️ UserScripts like **ABSidekick** will run **code** in your browser when you visit certain pages. It is important to be aware of this and therefore only install UserScripts from trusted sources.

>
> **Source: [GitHub](https://github.com/WirlyWirly/ABSidekick)**<br>
> **Install: [🌱 ABSidekick](https://raw.githubusercontent.com/WirlyWirly/ABSidekick/main/ABSidekick.user.js?raw=true)**<br>
> Written on [🐺 LibreWolf](https://librewolf.net/) via [🐵 Violentmonkey](https://violentmonkey.github.io/)
