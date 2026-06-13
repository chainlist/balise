# Changelog

## [0.27.0](https://github.com/chainlist/balise/compare/v0.26.0...v0.27.0) (2026-06-13)


### Features

* added proper keys formatting for shortcuts ([cbf2055](https://github.com/chainlist/balise/commit/cbf205598032a7bda48a21bca60ec9824524d4de))
* **shortcuts:** Global shortcuts can now be remapped ([bc2dfd4](https://github.com/chainlist/balise/commit/bc2dfd4ee3621287f03b6311029c5d248716e48d))

## [0.26.0](https://github.com/chainlist/balise/compare/v0.25.0...v0.26.0) (2026-06-13)


### Features

* **settings:** Unify how settings object is being computed and change its default path to $Balise/.balise folder ([6c80221](https://github.com/chainlist/balise/commit/6c802210d01400fe54f0094bcaad4f9fbfe3b9e2))


### Bug Fixes

* **wizzard:** Added theme selection back to wizzard ([b9b9209](https://github.com/chainlist/balise/commit/b9b9209471078a8e08af8ec31b2308e8ae6d19d5))
* **wizzard:** Added theme selection back to wizzard ([d2673c6](https://github.com/chainlist/balise/commit/d2673c6d20913eb9828d16f3c0174a98da36bb97))

## [0.25.0](https://github.com/chainlist/balise/compare/v0.24.0...v0.25.0) (2026-06-13)


### Features

* **editor:** added image description ([af61042](https://github.com/chainlist/balise/commit/af610427547cd7e172804d4b402e5befffd08442))
* **ui:** Added the possibility to change the mesh size ([aa30c46](https://github.com/chainlist/balise/commit/aa30c46f8fdd6b01d644154f1633f8c3fecc9682))
* **ui:** Added the possibility to change the prime color ([2771b98](https://github.com/chainlist/balise/commit/2771b9820cf04ef79023598918a3065586248360))
* **ui:** Change tags spacing and default UI settings ([f0e3564](https://github.com/chainlist/balise/commit/f0e356443408ae95501050ebdc2c728250cb8bbf))


### Bug Fixes

* **note-preview:** Fix link opening inside the webview ([21386f3](https://github.com/chainlist/balise/commit/21386f360782af9557f825c7f7c7c3310b51c64a))
* **quick:** QuickAdd window now listen to dark mode theme change ([66a6b00](https://github.com/chainlist/balise/commit/66a6b00b466c09f221232f947eb991905c47b33f))
* **window:** stop saving visibility state to avoid having hidden window on app startup ([06c491d](https://github.com/chainlist/balise/commit/06c491d73cc88e94cf8e14f55762f946854c0429))

## [0.24.0](https://github.com/chainlist/balise/compare/v0.23.1...v0.24.0) (2026-06-12)


### Features

* **editor:** added creation date + reading time as note header ([#46](https://github.com/chainlist/balise/issues/46)) ([4f992e9](https://github.com/chainlist/balise/commit/4f992e9b987d25a4eaa2595076f7edc3cc3a060d))
* **settings:** configurable magic tags ([0596aa7](https://github.com/chainlist/balise/commit/0596aa71832ddafc866cbcae481c91ca52068255))
* **systray:** Added systray capability ([c1816c7](https://github.com/chainlist/balise/commit/c1816c76ae37836ed51a1ecaa59419118fcf0f47))
* **toast:** Added toaster whenever something fails ([f39a5da](https://github.com/chainlist/balise/commit/f39a5da062b1558d18d22860729eac920fadb018))
* **toast:** Added toaster whenever something fails ([15fc270](https://github.com/chainlist/balise/commit/15fc270c234676b2d2602e34e3e18097fc9a7706))
* **ui:** Add frost effect and custom colors ([#47](https://github.com/chainlist/balise/issues/47)) ([3552506](https://github.com/chainlist/balise/commit/355250627a50ba3d6d100372a407dfe932877f65))
* **ui:** Add mesh colors ([364f54f](https://github.com/chainlist/balise/commit/364f54f67683cf6dd4c0f3e61f5f03a429d17af2))


### Bug Fixes

* **editor:** flush pending save on unmount and seed editor from note.content ([3732350](https://github.com/chainlist/balise/commit/37323501fbca4dfabbc297b4c4a4d2ed69cce81b))
* **editor:** wrong margin that caused the editor to wrongfully calculate the content height, making the cursor jump too far on rare circumstances ([84e87af](https://github.com/chainlist/balise/commit/84e87afeab258ab0e6fac36f33a867def0361c50))
* **journal:** drop stale date-load responses; remove dead note keying ([3fce056](https://github.com/chainlist/balise/commit/3fce056ba453273c158729e5366d43bc2306423c))
* **note-preview:** blinking image on update ([0c02c98](https://github.com/chainlist/balise/commit/0c02c984a4e8ecc199fff9656ea86b8d4f75ab7c))
* **quick-add:** Change shortcut to use f12 instead of space key ([4a33f7c](https://github.com/chainlist/balise/commit/4a33f7cdcf2f08bb6e4f9ff0bdba9974ccc200db))
* **sync:** preserve file mtime as updated_at on note import ([302f3c4](https://github.com/chainlist/balise/commit/302f3c420ad26d4ad6befa75f8a66997f4e7038e))
* **ui-state:** make switchDesk failure-safe ([d66c223](https://github.com/chainlist/balise/commit/d66c223e3425121c7376feef0861eee072a1e151))

## [0.23.1](https://github.com/chainlist/balise/compare/v0.23.0...v0.23.1) (2026-06-08)


### Bug Fixes

* **editor:** placeholder cursor size ([9c7c73f](https://github.com/chainlist/balise/commit/9c7c73f564af32cb2ec233e1215caf4a51268d1a))

## [0.23.0](https://github.com/chainlist/balise/compare/v0.22.1...v0.23.0) (2026-06-08)


### Features

* **quick:** Added quick add window mode ([e09e85a](https://github.com/chainlist/balise/commit/e09e85a2f28ce811bb911444f9625e7860f4b015))
* **quick:** Added quick add window mode ([3956816](https://github.com/chainlist/balise/commit/39568165c6b380be571e7b3e40d0a8309dd84f33))

## [0.22.1](https://github.com/chainlist/balise/compare/v0.22.0...v0.22.1) (2026-06-08)


### Bug Fixes

* **editor:** Fix missing placeholder on empty line ([aa3fa09](https://github.com/chainlist/balise/commit/aa3fa09671aa0e9ff7941675491e6e370f81aa8e))

## [0.22.0](https://github.com/chainlist/balise/compare/v0.21.1...v0.22.0) (2026-06-08)


### Features

* added back the forced graph ([fc65425](https://github.com/chainlist/balise/commit/fc65425a39fbdf3a961242e4bed461a9a4a02144))
* Radial graph added ([e5ca57e](https://github.com/chainlist/balise/commit/e5ca57e848b7154ec28f5bfc47b1cffbfcef2c03))


### Bug Fixes

* **graph:** now selecting a tag refresh the notes list ([a6b342b](https://github.com/chainlist/balise/commit/a6b342bd64dc7669bcb41b10205a402b17b2944a))
* **graph:** switching desk while on the graph page properly reload the tags ([1b735ab](https://github.com/chainlist/balise/commit/1b735ab0296b24ef02b9dbe5b6e857bb43a06f6c))

## [0.21.1](https://github.com/chainlist/balise/compare/v0.21.0...v0.21.1) (2026-06-04)


### Bug Fixes

* **graph:** lag feeling when navigating out of the graph ([0212c94](https://github.com/chainlist/balise/commit/0212c9405cb40c3d155e5c38da05eb749741d1ed))

## [0.21.0](https://github.com/chainlist/balise/compare/v0.20.0...v0.21.0) (2026-06-04)


### Features

* **graph:** new sunburst graph ([93a2db5](https://github.com/chainlist/balise/commit/93a2db54caf5d811942c27201fb8c7a9e12d323d))
* sunburst graph ([00f795a](https://github.com/chainlist/balise/commit/00f795a52fa22b86ab3ff8991967e85b562164f6))

## [0.20.0](https://github.com/chainlist/balise/compare/v0.19.2...v0.20.0) (2026-06-02)


### Features

* case-insensitive tag sort and translated new-note title ([b31a748](https://github.com/chainlist/balise/commit/b31a7488a00c8c1a45b6c31e4a0ca52b4cbd6bd3))


### Bug Fixes

* **graph:** change default graph settings ([010cb2c](https://github.com/chainlist/balise/commit/010cb2cbbb4a101e1b1387cc347236268182a61a))

## [0.19.2](https://github.com/chainlist/balise/compare/v0.19.1...v0.19.2) (2026-06-01)


### Bug Fixes

* **notes:** Fix notes card shrinking issue ([27198bd](https://github.com/chainlist/balise/commit/27198bdab72904285d534f2f6734e35fd2d72c36))

## [0.19.1](https://github.com/chainlist/balise/compare/v0.19.0...v0.19.1) (2026-06-01)


### Bug Fixes

* **editor:** Disable Paragraph folding ([126ab20](https://github.com/chainlist/balise/commit/126ab2019d3326be54092292e94a3b67860ee89b))

## [0.19.0](https://github.com/chainlist/balise/compare/v0.18.0...v0.19.0) (2026-06-01)


### Features

* **tasks:** kanban board view + German localisation ([15b9974](https://github.com/chainlist/balise/commit/15b997494b2d2fdc5c78e44d13245cedc60d9d76))

## [0.18.0](https://github.com/chainlist/balise/compare/v0.17.0...v0.18.0) (2026-06-01)


### Features

* **editor:** wire completionKeymap and strip trailing whitespace on save ([a499a5c](https://github.com/chainlist/balise/commit/a499a5c9bdb1b08a446207f89b8ff2ad8c39d219))
* **graph:** canvas-based tag knowledge graph view ([90b2db4](https://github.com/chainlist/balise/commit/90b2db49068891cecb202be3c4cef181bfbf4136))
* **ui:** editor folding, heading colors, and sidebar polish ([efc752c](https://github.com/chainlist/balise/commit/efc752c74f7a02af30349aa2c9a8199c3fa7d375))


### Bug Fixes

* **editor:** bind Tab/Shift-Tab to indent for list nesting ([1cf87e3](https://github.com/chainlist/balise/commit/1cf87e353ce8d83f4a842f4aa14eb4855045e8e8))

## [0.17.0](https://github.com/chainlist/balise/compare/v0.16.1...v0.17.0) (2026-05-31)


### Features

* tag autocompletion in note editor ([9b29ae7](https://github.com/chainlist/balise/commit/9b29ae775a42ed0b89cb2c7a0d06b2fb68afb855))

## [0.16.1](https://github.com/chainlist/balise/compare/v0.16.0...v0.16.1) (2026-05-31)


### Bug Fixes

* news not showing up ([198d8e9](https://github.com/chainlist/balise/commit/198d8e99037a605e3d49638df696446bbde5d553))

## [0.16.0](https://github.com/chainlist/balise/compare/v0.15.0...v0.16.0) (2026-05-31)


### Features

* show release notes dialog on version update ([bd65c1b](https://github.com/chainlist/balise/commit/bd65c1b1c213182cf23235e3818f6d23cd505616))


### Performance Improvements

* optimize boot sync via Rust FS commands ([efcf633](https://github.com/chainlist/balise/commit/efcf633b5566c9201e12479d58f40d414af946f5))

## [0.15.0](https://github.com/chainlist/balise/compare/v0.14.0...v0.15.0) (2026-05-30)


### Features

* **desk:** renaming is now possible ([dec7389](https://github.com/chainlist/balise/commit/dec7389c7b7847ed1b6791d3382d6b33a60a1556))
* **desk:** renaming is possible ([dec7389](https://github.com/chainlist/balise/commit/dec7389c7b7847ed1b6791d3382d6b33a60a1556))

## [0.14.0](https://github.com/chainlist/balise/compare/v0.13.2...v0.14.0) (2026-05-28)


### Features

* added zen mode with cmd+shift+z ([a148666](https://github.com/chainlist/balise/commit/a1486664bfc510a417b7c6b055f16fc347794b38))
* **notes:** lazy-load note content and add preview column ([8bd6e0c](https://github.com/chainlist/balise/commit/8bd6e0c65ed273e3a80807c062c769287e871411))
* **sidebar:** show note preview text below title in notes list ([907441a](https://github.com/chainlist/balise/commit/907441aa3c8208346af67106677dbb3458edc3b2))


### Bug Fixes

* **image:** remove empty line above image widget ([d680806](https://github.com/chainlist/balise/commit/d680806204d975bbb506b68bc346a2cb116525bf))
* remove single-quote auto-pair and bump Cargo version to 0.13.2 ([27fbef3](https://github.com/chainlist/balise/commit/27fbef372dbdf1d2fcb375a544d557cefc579dd1))
* **sidebar:** fix missing animation on sidebar tag item ([7e2ed74](https://github.com/chainlist/balise/commit/7e2ed749c556b38876826d4ec2cf931a25fee80e))
* **sidebar:** note item active/hover border uses correct opacity per state ([2e38b66](https://github.com/chainlist/balise/commit/2e38b662574d35d41c4990f3db846f2df2304340))
* update sidebar styles and layout ([62b9525](https://github.com/chainlist/balise/commit/62b9525ec0fefb7ebfabdb8e6ab2a86711b163ee))

## [0.13.2](https://github.com/chainlist/balise/compare/v0.13.1...v0.13.2) (2026-05-27)


### Bug Fixes

* **code:** fix code block resolution ([e56b6fa](https://github.com/chainlist/balise/commit/e56b6fa68bc685e7fc101aecc523725471fc0a46))

## [0.13.1](https://github.com/chainlist/balise/compare/v0.13.0...v0.13.1) (2026-05-27)


### Bug Fixes

* **sidebar:** Fix sidebar animations ([#19](https://github.com/chainlist/balise/issues/19)) ([476078f](https://github.com/chainlist/balise/commit/476078f78138b589a0aa92ebb44e67512e5ad3de))

## [0.13.0](https://github.com/chainlist/balise/compare/v0.12.1...v0.13.0) (2026-05-27)


### Features

* **design:** Redisgn completely the sidebar to have a more zen/unbloated aesthetic ([#18](https://github.com/chainlist/balise/issues/18)) ([5243ccc](https://github.com/chainlist/balise/commit/5243ccc67c135aa96fe86313e1a8ae695f5fb30b))


### Bug Fixes

* **journal:** reload journal when switching desk ([bbed29b](https://github.com/chainlist/balise/commit/bbed29bec9538a03f882ec1eef1bd73a64258bb5))

## [0.12.1](https://github.com/chainlist/balise/compare/v0.12.0...v0.12.1) (2026-05-27)


### Bug Fixes

* **journal:** add popover calendar button ([f31e90d](https://github.com/chainlist/balise/commit/f31e90d681347bb2f57ddf81ddf3fffa419774f7))
* **journal:** fix small size window calendar display by displaying a button instead of the full calendar ([ed9ab60](https://github.com/chainlist/balise/commit/ed9ab6073379e12d323129d9391bb3dabe915980))
* only notes with #journal tag are turned in the journal ([d59d15a](https://github.com/chainlist/balise/commit/d59d15a626d726522746885c9fa445ef83259868))

## [0.12.0](https://github.com/chainlist/balise/compare/v0.11.0...v0.12.0) (2026-05-27)


### Features

* **journal:** lazy note creation, local-date grouping, single focus ([7e06231](https://github.com/chainlist/balise/commit/7e0623119f843ee6fa5e026b6908f52dd10ff837))


### Bug Fixes

* change journal ordering ([556da9d](https://github.com/chainlist/balise/commit/556da9da7a69b1b3f70665d590d44ab90e160999))
* **checkbox:** change the way checkbox are displayed after a new line on MarkMode.Never ([00b8275](https://github.com/chainlist/balise/commit/00b8275d9335ca246915a2f1c22003d0b9e6b262))
* notes not saving on proper date ([fa72b14](https://github.com/chainlist/balise/commit/fa72b143972799aef11f3e9545994c80af96096a))

## [0.11.0](https://github.com/chainlist/balise/compare/v0.10.0...v0.11.0) (2026-05-26)


### Features

* **cm:** inline task editing via hover edit button in never mode ([aa3f6d7](https://github.com/chainlist/balise/commit/aa3f6d77569346186f59c8c3bfcc2ae9ef5a2a1d))
* **images:** Add images handling ([#14](https://github.com/chainlist/balise/issues/14)) ([72682b6](https://github.com/chainlist/balise/commit/72682b6f39668821410e35b5a773bcce1692910e))


### Bug Fixes

* **cm:** enable task card editing by revealing raw markdown on cursor line ([f7588ab](https://github.com/chainlist/balise/commit/f7588ab65fc53cde21115a5b8a9f973d5a5d43cf))
* **cm:** extend markNavPlugin to treat link widgets as atomic ranges ([d0ad0b9](https://github.com/chainlist/balise/commit/d0ad0b9353de09e6bf2542a235d07335090d9030))
* **cm:** restore ignoreEvents=false and button-only mousedown guard on TaskWidget ([804887f](https://github.com/chainlist/balise/commit/804887fc060c68059000eb51c9f78a5eaa384d6c))
* TaskCard events not working properly on MarkMode.Never and MarkMode.Cursor ([3e9a4c4](https://github.com/chainlist/balise/commit/3e9a4c4a8a4fea66f1c80a71a513b61dc431651b))

## [0.10.0](https://github.com/chainlist/balise/compare/v0.9.0...v0.10.0) (2026-05-26)


### Features

* **cm:** atomic ranges + canonical cursor stepping for hidden marks ([9c97b0f](https://github.com/chainlist/balise/commit/9c97b0f98dbdee0746ea99dcdc9e811ac108ca08))

## [0.9.0](https://github.com/chainlist/balise/compare/v0.8.0...v0.9.0) (2026-05-26)


### Features

* upgrading cargo ([e2eadd1](https://github.com/chainlist/balise/commit/e2eadd1444c6ed961a7af9fc5ee4994b6b7f2ddd))

## [0.8.0](https://github.com/chainlist/balise/compare/v0.7.0...v0.8.0) (2026-05-26)


### Features

* added built with section in About settings ([ae1bde7](https://github.com/chainlist/balise/commit/ae1bde7be0e2be1e748919d2da7d2dde9616c7a5))
* Added Wizzard on first launch ([a411089](https://github.com/chainlist/balise/commit/a411089faf69378ff701a68b2b8fb12449ffcfcd))

## [0.7.0](https://github.com/chainlist/balise/compare/v0.6.1...v0.7.0) (2026-05-25)


### Features

* tidy sidebar + add groups ([c5ab71d](https://github.com/chainlist/balise/commit/c5ab71dc421654cd0696cdcf82be540150183c7c))


### Bug Fixes

* dark mode ([4d54e64](https://github.com/chainlist/balise/commit/4d54e645eb73548951c469fb92e1779c333cfcab))
* notes not syncing from FS correctly ([5a639bb](https://github.com/chainlist/balise/commit/5a639bbf3c0a4efc517fad17edeaec759d7c858a))
* scroller not taking full editor width ([ebaf1a7](https://github.com/chainlist/balise/commit/ebaf1a7063d8d4cb85061f61f1c05394b0b594f5))

## [0.6.1](https://github.com/chainlist/balise/compare/v0.6.0...v0.6.1) (2026-05-25)


### Bug Fixes

* checkbox mark shown even with markMode setting set to ([8534bc5](https://github.com/chainlist/balise/commit/8534bc5de7433ba7158236632fb6e2d65757487e))

## [0.6.0](https://github.com/chainlist/balise/compare/v0.5.0...v0.6.0) (2026-05-25)


### Features

* add Checklists widget ([ae46a4c](https://github.com/chainlist/balise/commit/ae46a4cb9237146aa9e63b7ce2e47bcccb8245fa))
* add slash command menu to editor ([4c726a5](https://github.com/chainlist/balise/commit/4c726a588a617f20e4adbd59704f24320a5926d3))

## [0.5.0](https://github.com/chainlist/balise/compare/v0.4.0...v0.5.0) (2026-05-25)


### Features

* add manual auto update check ([7283a32](https://github.com/chainlist/balise/commit/7283a32c39e0037ae109fa5d45a15e9a6d3f662e))

## [0.4.0](https://github.com/chainlist/balise/compare/v0.3.2...v0.4.0) (2026-05-25)


### Features

* change max font size to 42 ([86f1e4a](https://github.com/chainlist/balise/commit/86f1e4a37edb40d55b635031323960e380d1fa61))

## [0.3.2](https://github.com/chainlist/balise/compare/v0.3.1...v0.3.2) (2026-05-25)


### Bug Fixes

* failing release job ([cbf298e](https://github.com/chainlist/balise/commit/cbf298e9c0190c5a5852ecbc1c6bdb6ce88caca6))

## [0.3.1](https://github.com/chainlist/balise/compare/v0.3.0...v0.3.1) (2026-05-25)


### Bug Fixes

* use PAT in release-please to allow triggering release workflow ([54e2980](https://github.com/chainlist/balise/commit/54e2980873199fbbf863e05584bed69f5d7b2eff))

## [0.3.0](https://github.com/chainlist/balise/compare/v0.2.0...v0.3.0) (2026-05-25)


### Features

* add auto-updater ([e4069ce](https://github.com/chainlist/balise/commit/e4069cebebc8e1a82610e394606cedc22a857a8b))
* add command palette with note/tag/command search, render markdown in TaskCard ([d9ba4da](https://github.com/chainlist/balise/commit/d9ba4da462d3d616d0b80f8ebe545f98cf7ffb04))
* add dashboard ([fbb8fa2](https://github.com/chainlist/balise/commit/fbb8fa25c7914b32296630d5451c7c69221b8bba))
* add highlight feature with =syntax= ([ed17ae0](https://github.com/chainlist/balise/commit/ed17ae0637d40679f32079aaaef03691037d6b41))
* add line height setting for the editor ([db1fe92](https://github.com/chainlist/balise/commit/db1fe92358f93c7b5308e7add929de46cd6ea6bb))
* add preview examples to markdown marks setting cards ([97bea20](https://github.com/chainlist/balise/commit/97bea202bbee3a8207ab566b116397a41aaccbfa))
* add settings modal ([ea1f1a1](https://github.com/chainlist/balise/commit/ea1f1a19198c561a54d68981744f579a579c2c80))
* add tagName component to avoid unecessary lookup ([e6df378](https://github.com/chainlist/balise/commit/e6df378cb3e3d7475632f0bbabaae7629096fc28))
* add title column to notes table, extract on create/update ([86516d4](https://github.com/chainlist/balise/commit/86516d44486fb930eb914b2f608f2f411475a566))
* add translations ([1300a14](https://github.com/chainlist/balise/commit/1300a1428aa6469166f2af85e7458c3e536ebdfb))
* add URL capbilities ([2150ce2](https://github.com/chainlist/balise/commit/2150ce21c5b8be9a578616f18f23ffbc1e45c2f4))
* added fs sync ([0c365d8](https://github.com/chainlist/balise/commit/0c365d888a4ecce8eb9bff3ed0f3fb0ac9acef50))
* added keymap ([2ae54eb](https://github.com/chainlist/balise/commit/2ae54eb946c24b528bc6475619afd788f6d9c800))
* added loading animation until UI is ready ([af24b7b](https://github.com/chainlist/balise/commit/af24b7b15ffad6b837c80b97f23f0d50a5bc7e52))
* added logo ([8d1eb7f](https://github.com/chainlist/balise/commit/8d1eb7f0e8c3232c27dfacc96ef487abf2a4bb4a))
* added related tag discovery ([819a891](https://github.com/chainlist/balise/commit/819a89104fddd68822c3c533c248fa23a0d16057))
* added settings store sync + custom editor view ([e5f1566](https://github.com/chainlist/balise/commit/e5f15669bee7294c8ab8947a6c4752050a596339))
* added shortcuts ([2830865](https://github.com/chainlist/balise/commit/2830865504b70626e2911174c5a3b1ec74d1e3e6))
* added task block ([5ecc269](https://github.com/chainlist/balise/commit/5ecc269e24ad20918c6a2fb5f5ad0b1c218d38d8))
* added updatenotifier + translations ([ed88c47](https://github.com/chainlist/balise/commit/ed88c47b0fe7ffb47cb5a6737b2a13f8bfc14c5a))
* code block ([51de7b1](https://github.com/chainlist/balise/commit/51de7b16f7781a63a060ae2e0366c6c589bbc1c4))
* fix marks to not toggle on keyinput style ([8335d75](https://github.com/chainlist/balise/commit/8335d7521f38a362cd035df105c251e5c3fc21db))
* optimized parsing regex ([5eb0303](https://github.com/chainlist/balise/commit/5eb0303f387a83a775d5bbc94e891df65827e733))
* replace sidebar sheets with centered dialog modals ([fd21319](https://github.com/chainlist/balise/commit/fd213195e79d764f945d02360d9d46805fd02a4c))
* show FTS5 excerpts with mark highlights in command palette ([a90b9af](https://github.com/chainlist/balise/commit/a90b9af14529662a4d31e5009a72c6cae0e92772))


### Bug Fixes

* active tag left border via data-active variants, add icon to workspace selector ([4de36e6](https://github.com/chainlist/balise/commit/4de36e67c633dffb5e9b6ef6d0f0834b7337baba))
* correct background zones (notes list gray, editor white) ([1295801](https://github.com/chainlist/balise/commit/1295801143f9c334f1bff560fbb2da70a0c1c18d))
* correct typo Personnal -&gt; Personal in default desk name ([733ccc4](https://github.com/chainlist/balise/commit/733ccc47ae087512eab6b0637d342e2b2bd35c8e))
* declare $props before $effect and await deleteNote in NoteEditor ([1459090](https://github.com/chainlist/balise/commit/1459090949558a3892c66a7e0623015be53bd9ac))
* imports ([efc4fea](https://github.com/chainlist/balise/commit/efc4fea56116746fda95dd69d6639e9a494e31ad))
* light sidebar with dark text matching the mockup ([c491354](https://github.com/chainlist/balise/commit/c491354f18cecdf1eeb7de2df119b8d88ce95d66))
* move UNTAGGED_FILTER to tags service and sync tags on FS import ([0716d28](https://github.com/chainlist/balise/commit/0716d28133dbdef0f95bdaf73a73c49ef830146c))
* note cards light blue tint, white only when selected ([c4bd44e](https://github.com/chainlist/balise/commit/c4bd44ef3f73324fb485a82bca062b19c369d41e))
* notes sidebar lighter blue-gray, not white ([8ab17c3](https://github.com/chainlist/balise/commit/8ab17c3f25de0543cab7f0d553fed894f8ab4f2b))
* notes sidebar white bg, distinct from nav sidebar ([d8c00a8](https://github.com/chainlist/balise/commit/d8c00a8cce5931bd9da67ebd3d52bcaa854e2f55))
* remove dead initDone state, ready depends solely on uiState.ready ([2bae0d3](https://github.com/chainlist/balise/commit/2bae0d32d836e373622c825af0f5b29b51489fc2))
* render button element in TagChip when navigate is true for a11y ([d2556e8](https://github.com/chainlist/balise/commit/d2556e8322156604df4eb40d22dbc82e86e0aae2))
* replace invalid &lt;dir&gt; element with &lt;div&gt; in Sidebar ([1e61daf](https://github.com/chainlist/balise/commit/1e61daf0edc6e8fd7e07a2dcdc6284df5d0a4700))
* replace non-interactive div with role=button and keyboard handler in TagSidebarItem ([0b57cdf](https://github.com/chainlist/balise/commit/0b57cdf3031084ca46128cdb22fcec904d056fe9))
* replace SvelteSet with Set in pure extractTags function, remove dead code in TaskCard ([4546857](https://github.com/chainlist/balise/commit/4546857111fd39b4f39324a021491f4aa757a2b8))
* sidebar bg matches app background (light blue-gray) ([0cdb33b](https://github.com/chainlist/balise/commit/0cdb33b9908ee9c2fbde7138cdd9aaf9892f5a5b))
* strip markdown heading prefix from note title in sidebar ([31affa9](https://github.com/chainlist/balise/commit/31affa9724fec9e95bd064f7e91eb09abc6aa0a3))
* support multiple subscribers in NoteSignals ([12414e5](https://github.com/chainlist/balise/commit/12414e50d2574fc80062be402f6d7773fe6e5aa0))
* task component now working properly ([1cb0509](https://github.com/chainlist/balise/commit/1cb0509b115b9f3f2ae0c4acd424986087b90294))
* trigger release workflow on release event and clean up tag format ([c129be8](https://github.com/chainlist/balise/commit/c129be85ab322c997a839690cc5a0f2809c81889))
* unselected cards outline-only, selected card white with shadow ([00f1794](https://github.com/chainlist/balise/commit/00f17945bc634a557b549bbd2336a0f8195e6058))
* unselected note cards transparent, selected card white with border ([e439038](https://github.com/chainlist/balise/commit/e439038ac96e392cb37ab446d43e8cd6313f0662))
* wrap each SQL migration in a transaction with rollback on failure ([9aba7ea](https://github.com/chainlist/balise/commit/9aba7ea4ed47c6651236281d7cdb2d697c0c4fc9))

## [0.2.0](https://github.com/chainlist/balise/compare/balise-v0.1.0...balise-v0.2.0) (2026-05-25)


### Features

* add auto-updater ([e4069ce](https://github.com/chainlist/balise/commit/e4069cebebc8e1a82610e394606cedc22a857a8b))
* add command palette with note/tag/command search, render markdown in TaskCard ([d9ba4da](https://github.com/chainlist/balise/commit/d9ba4da462d3d616d0b80f8ebe545f98cf7ffb04))
* add dashboard ([fbb8fa2](https://github.com/chainlist/balise/commit/fbb8fa25c7914b32296630d5451c7c69221b8bba))
* add highlight feature with =syntax= ([ed17ae0](https://github.com/chainlist/balise/commit/ed17ae0637d40679f32079aaaef03691037d6b41))
* add line height setting for the editor ([db1fe92](https://github.com/chainlist/balise/commit/db1fe92358f93c7b5308e7add929de46cd6ea6bb))
* add preview examples to markdown marks setting cards ([97bea20](https://github.com/chainlist/balise/commit/97bea202bbee3a8207ab566b116397a41aaccbfa))
* add settings modal ([ea1f1a1](https://github.com/chainlist/balise/commit/ea1f1a19198c561a54d68981744f579a579c2c80))
* add tagName component to avoid unecessary lookup ([e6df378](https://github.com/chainlist/balise/commit/e6df378cb3e3d7475632f0bbabaae7629096fc28))
* add title column to notes table, extract on create/update ([86516d4](https://github.com/chainlist/balise/commit/86516d44486fb930eb914b2f608f2f411475a566))
* add translations ([1300a14](https://github.com/chainlist/balise/commit/1300a1428aa6469166f2af85e7458c3e536ebdfb))
* add URL capbilities ([2150ce2](https://github.com/chainlist/balise/commit/2150ce21c5b8be9a578616f18f23ffbc1e45c2f4))
* added fs sync ([0c365d8](https://github.com/chainlist/balise/commit/0c365d888a4ecce8eb9bff3ed0f3fb0ac9acef50))
* added keymap ([2ae54eb](https://github.com/chainlist/balise/commit/2ae54eb946c24b528bc6475619afd788f6d9c800))
* added loading animation until UI is ready ([af24b7b](https://github.com/chainlist/balise/commit/af24b7b15ffad6b837c80b97f23f0d50a5bc7e52))
* added logo ([8d1eb7f](https://github.com/chainlist/balise/commit/8d1eb7f0e8c3232c27dfacc96ef487abf2a4bb4a))
* added related tag discovery ([819a891](https://github.com/chainlist/balise/commit/819a89104fddd68822c3c533c248fa23a0d16057))
* added settings store sync + custom editor view ([e5f1566](https://github.com/chainlist/balise/commit/e5f15669bee7294c8ab8947a6c4752050a596339))
* added shortcuts ([2830865](https://github.com/chainlist/balise/commit/2830865504b70626e2911174c5a3b1ec74d1e3e6))
* added task block ([5ecc269](https://github.com/chainlist/balise/commit/5ecc269e24ad20918c6a2fb5f5ad0b1c218d38d8))
* added updatenotifier + translations ([ed88c47](https://github.com/chainlist/balise/commit/ed88c47b0fe7ffb47cb5a6737b2a13f8bfc14c5a))
* code block ([51de7b1](https://github.com/chainlist/balise/commit/51de7b16f7781a63a060ae2e0366c6c589bbc1c4))
* fix marks to not toggle on keyinput style ([8335d75](https://github.com/chainlist/balise/commit/8335d7521f38a362cd035df105c251e5c3fc21db))
* optimized parsing regex ([5eb0303](https://github.com/chainlist/balise/commit/5eb0303f387a83a775d5bbc94e891df65827e733))
* replace sidebar sheets with centered dialog modals ([fd21319](https://github.com/chainlist/balise/commit/fd213195e79d764f945d02360d9d46805fd02a4c))
* show FTS5 excerpts with mark highlights in command palette ([a90b9af](https://github.com/chainlist/balise/commit/a90b9af14529662a4d31e5009a72c6cae0e92772))


### Bug Fixes

* active tag left border via data-active variants, add icon to workspace selector ([4de36e6](https://github.com/chainlist/balise/commit/4de36e67c633dffb5e9b6ef6d0f0834b7337baba))
* correct background zones (notes list gray, editor white) ([1295801](https://github.com/chainlist/balise/commit/1295801143f9c334f1bff560fbb2da70a0c1c18d))
* correct typo Personnal -&gt; Personal in default desk name ([733ccc4](https://github.com/chainlist/balise/commit/733ccc47ae087512eab6b0637d342e2b2bd35c8e))
* declare $props before $effect and await deleteNote in NoteEditor ([1459090](https://github.com/chainlist/balise/commit/1459090949558a3892c66a7e0623015be53bd9ac))
* imports ([efc4fea](https://github.com/chainlist/balise/commit/efc4fea56116746fda95dd69d6639e9a494e31ad))
* light sidebar with dark text matching the mockup ([c491354](https://github.com/chainlist/balise/commit/c491354f18cecdf1eeb7de2df119b8d88ce95d66))
* move UNTAGGED_FILTER to tags service and sync tags on FS import ([0716d28](https://github.com/chainlist/balise/commit/0716d28133dbdef0f95bdaf73a73c49ef830146c))
* note cards light blue tint, white only when selected ([c4bd44e](https://github.com/chainlist/balise/commit/c4bd44ef3f73324fb485a82bca062b19c369d41e))
* notes sidebar lighter blue-gray, not white ([8ab17c3](https://github.com/chainlist/balise/commit/8ab17c3f25de0543cab7f0d553fed894f8ab4f2b))
* notes sidebar white bg, distinct from nav sidebar ([d8c00a8](https://github.com/chainlist/balise/commit/d8c00a8cce5931bd9da67ebd3d52bcaa854e2f55))
* remove dead initDone state, ready depends solely on uiState.ready ([2bae0d3](https://github.com/chainlist/balise/commit/2bae0d32d836e373622c825af0f5b29b51489fc2))
* render button element in TagChip when navigate is true for a11y ([d2556e8](https://github.com/chainlist/balise/commit/d2556e8322156604df4eb40d22dbc82e86e0aae2))
* replace invalid &lt;dir&gt; element with &lt;div&gt; in Sidebar ([1e61daf](https://github.com/chainlist/balise/commit/1e61daf0edc6e8fd7e07a2dcdc6284df5d0a4700))
* replace non-interactive div with role=button and keyboard handler in TagSidebarItem ([0b57cdf](https://github.com/chainlist/balise/commit/0b57cdf3031084ca46128cdb22fcec904d056fe9))
* replace SvelteSet with Set in pure extractTags function, remove dead code in TaskCard ([4546857](https://github.com/chainlist/balise/commit/4546857111fd39b4f39324a021491f4aa757a2b8))
* sidebar bg matches app background (light blue-gray) ([0cdb33b](https://github.com/chainlist/balise/commit/0cdb33b9908ee9c2fbde7138cdd9aaf9892f5a5b))
* strip markdown heading prefix from note title in sidebar ([31affa9](https://github.com/chainlist/balise/commit/31affa9724fec9e95bd064f7e91eb09abc6aa0a3))
* support multiple subscribers in NoteSignals ([12414e5](https://github.com/chainlist/balise/commit/12414e50d2574fc80062be402f6d7773fe6e5aa0))
* task component now working properly ([1cb0509](https://github.com/chainlist/balise/commit/1cb0509b115b9f3f2ae0c4acd424986087b90294))
* unselected cards outline-only, selected card white with shadow ([00f1794](https://github.com/chainlist/balise/commit/00f17945bc634a557b549bbd2336a0f8195e6058))
* unselected note cards transparent, selected card white with border ([e439038](https://github.com/chainlist/balise/commit/e439038ac96e392cb37ab446d43e8cd6313f0662))
* wrap each SQL migration in a transaction with rollback on failure ([9aba7ea](https://github.com/chainlist/balise/commit/9aba7ea4ed47c6651236281d7cdb2d697c0c4fc9))
