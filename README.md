# Electromyography-Data-Labeling


<a id="readme-top"></a>

[![Release][release-shield]][release-url]
[![Number of downloads][statistics-shield]][statistics-url]

<br />
<div align="center">
  <a href="https://github.com/tuan6100/Bioelectrical-Signals-Labeling/releases/download/v1.3.3/biosignal-labeling-setup-1.3.3-win-x64-setup.exe">
    <img src="public/favicon/biosignal.ico" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Bioelectrical Signal Labeler</h3>

  <p align="center">
    A data labeling utility designed for physicians to select, assign label types, and save specific segments of raw EMG signal data
    <br />
    <a href="https://github.com/tuan6100/Bioelectrical-Signals-Labeling/blob/main/public/doc/HDSD%20Biosignal%20Labeling.pdf"><strong>Explore the docs</strong></a>
    <br />
    <br />
    <a href="https://github.com/tuan6100/Bioelectrical-Signals-Labeling/releases/tag/v1.3.3">Try Now</a>
    &middot;
    <a href="https://github.com/tuan6100/Bioelectrical-Signals-Labeling/issues/new?template=feature_request.md">Request New Dataset Template</a>
    &middot;
    <a href="https://lab.ibme.edu.vn/">About Us</a>
  </p>
</div>

## About The Project

![Product Name Screen Shot][product-screenshot]

* Offline-first desktop application built in Electron Framework that supports displaying graphs of electrocardiogram, electroencephalogram,
and electromyogram signals extracted from the measuring device, available with large datasets.
* Allow doctors to easily and quickly label diseases directly on graphs and export the labeled data for AI training and automation.
* The application has been validated and is currently trusted by doctors at several hospitals, such as [Hanoi Medical University hospital](https://benhviendaihocyhanoi.isofhcare.vn/) or [Vietlife Clinic](https://vietlifeclinic.vn/).

## For developer
Below are guidelines for developers interested in contributing to the development of this software. We greatly welcome your contributions.

### Prerequisites
* [Node.js](https://nodejs.org/en/download/current): Require minimum version 22
* [npm](https://docs.npmjs.com/cli/v11/configuring-npm/install): Any version (I had previously used pnpm but encountered an issue with an unknown cause during deployment.) 
* This application requires certain native dependencies that must be compiled for your operating system (such as [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)).
If you are using Windows and encounter errors during the build process, go to the Start menu and search for "Install Additional Tools for Node.js" to install the necessary build tools.
Please see more information at [the official website](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules).

### Installation
1. Clone the repo:
```shell
git clone https://github.com/tuan6100/Bioelectrical-Signals-Labeling.git
cd Bioelectrical-Signals-Labeling
```

2. Install dependencies:
```shell
npm ci
```
This process will take a considerable amount of time because native modules need to be compiled, as mentioned above.

3. Run the app
```shell
npm run dev:app
```
If you want to create an executable file (like .exe), please run "npm run build:${your-os}"  

### Contributing
Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

1. Fork the Project
2. Create your own branch (`git checkout -b feature/new-template`)
3. Commit your changes (`git commit -m 'Add new dataset template'`)
4. Push to the remote branch (`git push origin feature/new-template`)
5. Open a pull request to the **develop branch**. The main branch should only be merged from the develop branch after features have undergone thorough review and testing prior to deployment to the CI/CD environment.


## License
Distributed under the Apache License. See `LICENSE` for more information.


[release-shield]: https://img.shields.io/github/v/release/tuan6100/Bioelectrical-Signals-Labeling?include_prereleases&style=plastic&logoColor=green
[release-url]: https://github.com/tuan6100/Bioelectrical-Signals-Labeling/releases/tag/v1.3.4-beta
[statistics-shield]: https://img.shields.io/github/downloads/tuan6100/Bioelectrical-Signals-Labeling/latest/total
[statistics-url]: https://tooomm.github.io/github-release-stats/?username=tuan6100&repository=Bioelectrical-Signals-Labeling
[product-screenshot]: public/screenshot/demo.png