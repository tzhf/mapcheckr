const SV = new google.maps.StreetViewService();

export default function SVreq(loc, settings) {
    return new Promise(async (resolve, reject) => {
        if (!loc.panoId) {
            await SV.getPanoramaByLocation(new google.maps.LatLng(loc.lat, loc.lng), settings.radius, checkPano).catch((e) =>
                reject({ loc, reason: e.message })
            );
        } else {
            await SV.getPanoramaById(loc.panoId, checkPano).catch((e) => reject({ loc, reason: e.message }));
        }

        function checkPano(res, status) {
            if (status != google.maps.StreetViewStatus.OK) return reject({ ...loc, reason: "SV_NOT_FOUND" });

            if (settings.rejectUnofficial) {
                if (res.location.pano.length != 22) return reject({ ...loc, reason: "UNOFFICIAL" });
                if (settings.rejectNoDescription && !res.location.description && !res.location.shortDescription)
                    return reject({ ...loc, reason: "NO_DESCRIPTION" });
            }

            const cameraGeneration = getCameraGeneration(res);
            const isPanoID = loc.panoId ? true : false;
            const isPanned = loc.heading !== 0;

            // Filter by gen
            if (!settings.filterByGen[cameraGeneration]) {
                return reject({ ...loc, reason: "WRONG_GENERATION" });
            }

            // Filter by date
            if (
                Date.parse(res.imageDate) < Date.parse(settings.filterByDate.from) ||
                Date.parse(res.imageDate) > Date.parse(settings.filterByDate.to)
            ) {
                return reject({ ...loc, reason: "OUT_OF_DATE_RANGE" });
            }

            // Filter by panorama links
            if (settings.rejectNoLinks && res.links.length === 0) {
                return reject({ ...loc, reason: "ISOLATED" });
            }
            if (settings.rejectNoLinksIfNoHeading && res.links.length === 0 && !isPanned) {
                return reject({ ...loc, reason: "ISOLATED" });
            }

            // Update coordinates
            if (settings.updateCoordinates) {
                loc.lat = res.location.latLng.lat();
                loc.lng = res.location.latLng.lng();
            }

            // Update to latest pano
            if (settings.updatePanoIDs) {
                loc.panoId = res.time[res.time.length - 1].pano;
            }

            if (
                res.links.length !== 0 &&
                ((settings.headings.filterBy.panoID && isPanoID) || (settings.headings.filterBy.nonPanoID && !isPanoID)) &&
                ((settings.headings.filterBy.panned && isPanned) || (settings.headings.filterBy.unpanned && !isPanned))
            ) {
                let heading = 0;

                if (res.links.length === 1) {
                    heading = getHeading(settings.headings.directionBy["DEAD_END"], res);
                } else if (cameraGeneration) {
                    heading = getHeading(settings.headings.directionBy[cameraGeneration], res);
                }

                if (settings.headings.randomInRange) {
                    heading += randomInRange(settings.headings.range[0], settings.headings.range[1]);
                } else {
                    heading += Math.random() < 0.5 ? settings.headings.range[0] : settings.headings.range[1];
                }

                loc.heading = heading;

                // Set pitch
                if (settings.headings.updatePitch) {
                    loc.pitch = settings.headings.pitchDeviation;
                }
            }

            resolve(loc);
        }
    });
}

function getCameraGeneration(res) {
    const { worldSize } = res.tiles;
    switch (worldSize.height) {
        case 1664:
            return 1;
        case 6656:
            return 23;
        case 8192:
            return 4;
        default:
            return 0;
    }
}

function getHeading(direction, res) {
    const link = parseInt(res.links[0].heading);
    const forward = res.tiles.centerHeading;
    const backward = (res.tiles.centerHeading + 180) % 360;
    switch (direction) {
        case "link":
            return link;
        case "forward":
            return forward;
        case "backward":
            return backward;
        case "any":
            const randomInt = randomInRange(1, 3);
            return randomInt === 1 ? link : randomInt === 2 ? forward : backward;
    }
}

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// const closest = (arr, num) => arr.reduce((a, b) => (Math.abs(b - num) < Math.abs(a - num) ? b : a));

// const difference = (a, b) => {
//     const d = Math.abs(a - b);
//     return d > 180 ? 360 - d : d;
// };

// const getNearestHeading = (bs, a) => {
//     const ds = bs.map((b) => difference(a, b.heading));
//     return bs[ds.indexOf(Math.min.apply(null, ds))].heading;
// };
