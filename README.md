# 🌱 ABSidekick
<div align="center">
  <img src=".github/assets/preview.png" alt="absidekick" width="100%" />
</div><br>

This [UserScript](https://openuserjs.org/about/Userscript-Beginners-HOWTO) will add additional functionality directly into the [AudioBookshelf](https://www.audiobookshelf.org/) web interface. There are customizable settings that can be configured through the **ABSidekick Settings Panel**, which can be accessed by clicking the  `🛠️` emoji in the Audiobookshelf AppBar.

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


> ℹ️ If **ABSidekick** does not automatically run when you are on Audiobookshelf, you will need to edit the `@match` line near the top of the script with your actual URL. Be aware that future script updates will overwrite this edit back to the default.
>
> **Source: [GitHub](https://github.com/WirlyWirly/ABSidekick)**<br>
> **Install: [🌱 ABSidekick](https://raw.githubusercontent.com/WirlyWirly/ABSidekick/main/ABSidekick.user.js?raw=true)**<br>
> Written on [🐺 LibreWolf](https://librewolf.net/) via [🐵 Violentmonkey](https://violentmonkey.github.io/)
>
<br>
