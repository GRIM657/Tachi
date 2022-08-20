const { Command } = require("commander");
const sqlite3 = require("better-sqlite3");
const fs = require("fs");
const { CreateChartID, ReadCollection, WriteCollection } = require("../util");

const program = new Command();
program.requiredOption("-d, --db <maps.db>");
program.requiredOption("-f, --filter <path_filter>");
program.option("--debug", "Show debug logs", false);
program.parse(process.argv);
const options = program.opts();

// Change this to see logs in the terminal
const DEBUG = options.debug;

const db = sqlite3(options.db);
const dbRows = db.prepare(`SELECT * FROM Charts WHERE path LIKE '%${options.filter}%'`).all();
console.log(`Found ${dbRows.length} charts.`);

const songs = ReadCollection("songs-usc.json");
const charts = ReadCollection("charts-usc.json");
let maxSongId = Math.max(...songs.map((s) => s.id));
const folderIdToSongId = {};

let newSongs = 0;
let newCharts = 0;

for (const chart of dbRows) {
	// Check if chart already exists by comparing hash
	const existingChart = charts.find((c) => c.data.hashSHA1 === chart.hash);
	if (existingChart) {
		if (DEBUG) {
			console.log(`Chart ${chart.title} ${existingChart.difficulty} already exists.`);
		}
		continue;
	}

	if (!folderIdToSongId[chart.folderid]) {
		const splitPath = chart.path.replaceAll("\\", "/").split("/");
		const folderName = splitPath[splitPath.length - 2];
		const existingSong = songs.find(
			(s) =>
				(s.title === chart.title ||
					s.searchTerms.includes(folderName) ||
					s.searchTerms.includes(folderName.replaceAll("_", " ")) ||
					s.searchTerms.includes(folderName.replaceAll(" ", "_"))) &&
				s.artist === chart.artist
		);
		if (existingSong) {
			if (DEBUG) {
				console.log(`Song ${folderName} already exists with id ${existingSong.id}.`);
			}
			folderIdToSongId[chart.folderid] = existingSong.id;
		} else {
			const songID = maxSongId + 1;
			maxSongId = songID;
			songs.push({
				id: songID,
				title: chart.title,
				altTitles: [],
				artist: chart.artist,
				data: {},
				searchTerms: [folderName],
			});
			folderIdToSongId[chart.folderid] = songID;
			newSongs++;
			if (DEBUG) {
				console.log(`Added song ${songID} for folder ${folderName}.`);
			}
		}
	}

	const songID = folderIdToSongId[chart.folderid];

	for (const playtype of ["Controller", "Keyboard"]) {
		charts.push({
			chartID: CreateChartID(),
			data: {
				effector: chart.effector,
				hashSHA1: chart.hash,
				isOfficial: true,
				tableFolders: [],
			},
			difficulty: chart.diff_shortname,
			isPrimary: true,
			level: chart.level.toString(),
			levelNum: chart.level,
			playtype,
			rgcID: null,
			songID,
			tierlistInfo: {},
			versions: [],
		});
	}

	newCharts++;

	if (DEBUG) {
		console.log(`Added chart ${chart.title} ${chart.diff_shortname}.`);
	}
}

console.log(`Added ${newSongs} new songs and ${newCharts} new charts.`);

WriteCollection("songs-usc.json", songs);
WriteCollection("charts-usc.json", charts);
