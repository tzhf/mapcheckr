<template>
    <div class="wrapper">
        <div class="flex-center wrap space-between p-05">
            <h1>MapCheckr</h1>
            <div v-if="!state.started" class="flex-center wrap gap-05">
                Paste or
                <input @change="loadFromJSON" type="file" id="file" class="input-file" accept="application/json" />
                <label for="file" class="btn">Import JSON</label>
            </div>
            <div v-if="state.finished" class="flex-center wrap gap-02">
                <Button @click="resetState" text="Reset" />
            </div>
        </div>

        <div class="wrapper__inner">
            <div v-if="error" class="container center danger">{{ error }}</div>

            <div v-if="state.loaded" class="container center">
                <h4>{{ customMap.nbLocs }} imported {{ pluralize("location", customMap.nbLocs) }}</h4>
                <Button v-if="!state.started" @click="handleClickStart" class="mt-02" text="Start checking" />
            </div>

            <div v-if="!state.started" class="container">
                <h2>General settings</h2>
                <div class="content">
                    <div class="flex">
                        <div class="col-50">
                            <h4>Filter by coverage</h4>
                            <Checkbox v-model:checked="settings.filterByGen[1]" label="Gen 1" />
                            <Checkbox v-model:checked="settings.filterByGen[23]" label="Gen 2 & 3" />
                            <Checkbox v-model:checked="settings.filterByGen[4]" label="Gen 4" />
                        </div>

                        <div class="col-50">
                            <h4>Filter by date</h4>
                            <div class="form__row space-between">
                                <label>From :</label>
                                <input type="month" v-model="settings.filterByDate.from" min="2007-01" :max="dateToday" />
                            </div>
                            <div class="form__row space-between">
                                <label>To :</label>
                                <input type="month" v-model="settings.filterByDate.to" :max="dateToday" />
                            </div>
                        </div>
                    </div>
                    <hr />

                    <Checkbox
                        v-model:checked="settings.rejectUnofficial"
                        label="Reject unofficial"
                        optText="Uncheck for photospheres map"
                    />
                    <hr />

                    <div v-if="settings.rejectUnofficial">
                        <Checkbox
                            v-model:checked="settings.rejectNoDescription"
                            label="Reject locations without description"
                            optText="This might prevent trekkers in most cases, but can reject regular streetview without
						description (eg. Mongolia/South Korea)"
                        />
                        <hr />
                    </div>

                    <Checkbox
                        @change="settings.rejectNoLinks ? (settings.rejectNoLinksIfNoHeading = true) : true"
                        v-model:checked="settings.rejectNoLinks"
                        label="Reject all isolated locations"
                        optText="Uncheck for photospheres map. This is for locations with no arrows to move to a nearby location, which may include regular but broken coverage."
                    />
                    <hr />

                    <div v-if="!settings.rejectNoLinks">
                        <Checkbox
                            @change="settings.rejectNoLinksIfNoHeading ? true : (settings.rejectNoLinks = false)"
                            v-model:checked="settings.rejectNoLinksIfNoHeading"
                            label="Reject unpanned isolated locations"
                        />
                        <hr />
                    </div>

                    <Checkbox
                        v-model:checked="settings.updatePanoIDs"
                        label="Update panoIDs"
                        optText="Update your locations to the most recent coverage. Also useful to automatically panoID your map."
                    />
                    <hr />

                    <Checkbox
                        v-model:checked="settings.updateCoordinates"
                        label="Update coordinates"
                        optText="non-panoID locations might slightly change"
                    />
                    <hr />

                    Radius<input type="number" v-model.number="settings.radius" @change="handleRadiusInput" />m<br />
                    <small>Radius in which to search for a non-panoID'ed panorama.</small>
                    <hr />

                    <div class="flex-center">
                        <Checkbox v-model:checked="settings.removeNearby" label="Reject duplicates within a " />
                        <input type="number" v-model.number="settings.nearbyRadius" @change="handleNearbyRadiusInput" />m radius
                    </div>
                    <hr />
                </div>

                <h2>Headings</h2>
                <div class="content">
                    <div class="mb-1">
                        <h4>Update headings for :</h4>
                        <div class="indent">
                            <Checkbox v-model:checked="settings.headings.filterBy.panoID" label="panoID" />
                            <Checkbox v-model:checked="settings.headings.filterBy.nonPanoID" label="non-panoID" />
                            <Checkbox v-model:checked="settings.headings.filterBy.panned" label="panned" />
                            <Checkbox v-model:checked="settings.headings.filterBy.unpanned" label="unpanned" />
                            <small
                                v-if="Object.values(settings.headings.filterBy).some((val) => val) && !areHeadingSettingsGood"
                                class="danger"
                                >Incorrect heading settings</small
                            >
                        </div>
                    </div>

                    <div v-if="areHeadingSettingsGood">
                        <div class="mb-1">
                            <h4>Direction :</h4>
                            <div class="indent">
                                <div class="form__row space-between" v-if="settings.filterByGen[1]">
                                    Gen 1 :
                                    <select v-model="settings.headings.directionBy[1]">
                                        <option value="link">Along road</option>
                                        <option value="forward">To front of car</option>
                                        <option value="backward">To back of car</option>
                                        <option value="any">Any</option>
                                    </select>
                                </div>
                                <div class="form__row space-between" v-if="settings.filterByGen[23]">
                                    Gen 2 & 3 :
                                    <select v-model="settings.headings.directionBy[23]">
                                        <option value="link">Along road</option>
                                        <option value="forward">To front of car</option>
                                        <option value="backward">To back of car</option>
                                        <option value="any">Any</option>
                                    </select>
                                </div>
                                <div class="form__row space-between" v-if="settings.filterByGen[4]">
                                    Gen 4 :
                                    <select v-model="settings.headings.directionBy[4]">
                                        <option value="link">Along road</option>
                                        <option value="forward">To front of car</option>
                                        <option value="backward">To back of car</option>
                                        <option value="any">Any</option>
                                    </select>
                                </div>
                                <div
                                    class="form__row space-between"
                                    v-if="Object.values(settings.filterByGen).some((val) => val === true)"
                                >
                                    Dead ends :
                                    <select v-model="settings.headings.directionBy['DEAD_END']">
                                        <option value="link">Along road</option>
                                        <option value="forward">To front of car</option>
                                        <option value="backward">To back of car</option>
                                        <option value="any">Any</option>
                                    </select>
                                </div>

                                <label class="form__row space-between">
                                    Heading deviation :
                                    <Slider
                                        v-model="settings.headings.range"
                                        :min="-180"
                                        :max="180"
                                        :lazy="false"
                                        tooltipPosition="bottom"
                                        style="width: 140px"
                                    />
                                </label>

                                <Checkbox
                                    v-model:checked="settings.headings.randomInRange"
                                    label="Randomize in range"
                                    class="indent"
                                />
                            </div>
                        </div>
                        <div class="mb-1">
                            <Checkbox v-model:checked="settings.headings.updatePitch" label="Pitch :" class="strong" />
                            <div v-if="settings.headings.updatePitch" class="indent">
                                <label class="flex-center space-between">
                                    Pitch deviation :
                                    <Slider
                                        v-model.number="settings.headings.pitchDeviation"
                                        :min="-90"
                                        :max="90"
                                        :lazy="false"
                                        tooltipPosition="bottom"
                                        style="width: 140px"
                                    />
                                </label>
                                <small>0 by default. -90° for tarmac/+90° for sky</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="state.started" class="container center">
                <h2 v-if="!state.finished" class="flex wrap flex-center justify-center">
                    Processing
                    <Spinner />
                </h2>
                <h2 v-else>Results</h2>
                <p><Badge :text="state.step + '/' + customMap.nbLocs" /> {{ pluralize("location", customMap.nbLocs) }}</p>
                <p><Badge :number="state.success" /> success</p>
                <p><Badge changeClass :number="state.SVNotFound" /> streetview not found</p>
                <p><Badge changeClass :number="state.unofficial" /> unofficial</p>
                <p><Badge changeClass :number="state.noDescription" /> no description (potential trekker)</p>
                <p><Badge changeClass :number="state.wrongGeneration" /> wrong camera generation</p>
                <p><Badge changeClass :number="state.outOfDateRange" /> out of date criteria</p>
                <p v-if="settings.rejectNoLinks || settings.rejectNoLinksIfNoHeading">
                    <Badge changeClass :number="state.isolated" /> isolated{{ settings.rejectNoLinks ? "" : " and unpanned" }}
                </p>
                <p v-if="settings.removeNearby">
                    <Badge changeClass :number="state.tooClose" /> within the same ({{ settings.nearbyRadius }}m) radius
                </p>
            </div>

            <div v-if="state.finished" class="container">
                <h2 class="center">Export</h2>
                <div class="flex-center wrap space-between">
                    <h3 class="success">
                        {{ resolvedLocs.length }} resolved {{ pluralize("location", resolvedLocs.length) }} ({{
                            ((resolvedLocs.length / customMap.nbLocs) * 100).toFixed(2)
                        }}%)
                    </h3>
                    <div v-if="resolvedLocs.length" class="flex-center wrap gap-02">
                        <CopyToClipboard :customMap="customMap" :data="resolvedLocs" />
                        <ExportToJSON :customMap="customMap" :data="resolvedLocs" />
                        <ExportToCSV :customMap="customMap" :data="resolvedLocs" />
                    </div>
                </div>

                <hr />
                <div class="flex-center wrap space-between">
                    <h3 class="danger">
                        {{ allRejectedLocs.length }} rejected locations ({{
                            ((allRejectedLocs.length / customMap.nbLocs) * 100).toFixed(2)
                        }}%)
                    </h3>
                    <div class="flex-center wrap gap-02">
                        <CopyToClipboard :customMap="customMap" :data="allRejectedLocs" />
                        <ExportToJSON :customMap="customMap" :data="allRejectedLocs" isRejected />
                        <ExportToCSV :customMap="customMap" :data="allRejectedLocs" isRejected />
                    </div>
                </div>
                <div v-if="rejectedLocs.SVNotFound.length" class="flex-center wrap space-between">
                    <h3 class="danger">
                        - {{ rejectedLocs.SVNotFound.length }} SV not found ({{
                            ((rejectedLocs.SVNotFound.length / customMap.nbLocs) * 100).toFixed(2)
                        }}%)
                    </h3>
                    <div class="flex-center wrap gap-02">
                        <CopyToClipboard :customMap="customMap" :data="rejectedLocs.SVNotFound" />
                        <ExportToJSON :customMap="customMap" :data="rejectedLocs.SVNotFound" isRejected />
                        <ExportToCSV :customMap="customMap" :data="rejectedLocs.SVNotFound" isRejected />
                    </div>
                </div>
                <div v-if="rejectedLocs.unofficial.length" class="flex-center wrap space-between">
                    <h3 class="danger">
                        - {{ rejectedLocs.unofficial.length }} unofficial ({{
                            ((rejectedLocs.unofficial.length / customMap.nbLocs) * 100).toFixed(2)
                        }}%)
                    </h3>
                    <div class="flex-center wrap gap-02">
                        <CopyToClipboard :customMap="customMap" :data="rejectedLocs.unofficial" />
                        <ExportToJSON :customMap="customMap" :data="rejectedLocs.unofficial" isRejected />
                        <ExportToCSV :customMap="customMap" :data="rejectedLocs.unofficial" isRejected />
                    </div>
                </div>
                <div v-if="rejectedLocs.noDescription.length" class="flex-center wrap space-between">
                    <h3 class="danger">
                        - {{ rejectedLocs.noDescription.length }} no description (potential trekker) ({{
                            ((rejectedLocs.noDescription.length / customMap.nbLocs) * 100).toFixed(2)
                        }}%)
                    </h3>
                    <div class="flex-center wrap gap-02">
                        <CopyToClipboard :customMap="customMap" :data="rejectedLocs.noDescription" />
                        <ExportToJSON :customMap="customMap" :data="rejectedLocs.noDescription" isRejected />
                        <ExportToCSV :customMap="customMap" :data="rejectedLocs.noDescription" isRejected />
                    </div>
                </div>
                <div v-if="rejectedLocs.wrongGeneration.length" class="flex-center wrap space-between">
                    <h3 class="danger">
                        - {{ rejectedLocs.wrongGeneration.length }} wrong camera generation ({{
                            ((rejectedLocs.wrongGeneration.length / customMap.nbLocs) * 100).toFixed(2)
                        }}%)
                    </h3>
                    <div class="flex-center wrap gap-02">
                        <CopyToClipboard :customMap="customMap" :data="rejectedLocs.wrongGeneration" />
                        <ExportToJSON :customMap="customMap" :data="rejectedLocs.wrongGeneration" isRejected />
                        <ExportToCSV :customMap="customMap" :data="rejectedLocs.wrongGeneration" isRejected />
                    </div>
                </div>
                <div v-if="rejectedLocs.outOfDateRange.length" class="flex-center wrap space-between">
                    <h3 class="danger">
                        - {{ rejectedLocs.outOfDateRange.length }} doesn't match date criteria ({{
                            ((rejectedLocs.outOfDateRange.length / customMap.nbLocs) * 100).toFixed(2)
                        }}%)
                    </h3>
                    <div class="flex-center wrap gap-02">
                        <CopyToClipboard :customMap="customMap" :data="rejectedLocs.outOfDateRange" />
                        <ExportToJSON :customMap="customMap" :data="rejectedLocs.outOfDateRange" isRejected />
                        <ExportToCSV :customMap="customMap" :data="rejectedLocs.outOfDateRange" isRejected />
                    </div>
                </div>
                <div v-if="rejectedLocs.isolated.length" class="flex-center wrap space-between">
                    <h3 class="danger">
                        - {{ rejectedLocs.isolated.length }} isolated {{ settings.rejectNoLinks ? "" : " and unpanned" }} ({{
                            ((rejectedLocs.isolated.length / customMap.nbLocs) * 100).toFixed(2)
                        }}%)
                    </h3>
                    <div class="flex-center wrap gap-02">
                        <CopyToClipboard :customMap="customMap" :data="rejectedLocs.isolated" />
                        <ExportToJSON :customMap="customMap" :data="rejectedLocs.isolated" isRejected />
                        <ExportToCSV :customMap="customMap" :data="rejectedLocs.isolated" isRejected />
                    </div>
                </div>
            </div>

            <div v-if="state.finished && resolvedLocs.length > 0" class="container">
                <Distribution :locations="resolvedLocs" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { reactive, ref, computed } from "vue";
import SVreq from "@/utils/SVreq";

import Slider from "@vueform/slider";
import Button from "@/components/Elements/Button.vue";
import Checkbox from "@/components/Elements/Checkbox.vue";
import Badge from "@/components/Elements/Badge.vue";
import Spinner from "@/components/Elements/Spinner.vue";
import CopyToClipboard from "@/components/CopyToClipboard.vue";
import ExportToJSON from "@/components/ExportToJSON.vue";
import ExportToCSV from "./components/ExportToCSV.vue";
import Distribution from "@/components/CountryDistribution.vue";

const dateToday = new Date().getFullYear() + "-" + ("0" + (new Date().getMonth() + 1)).slice(-2);

const settings = reactive({
    radius: 50,
    filterByGen: {
        1: false,
        23: true,
        4: true,
    },
    filterByDate: {
        from: "2008-01",
        to: dateToday,
    },
    rejectUnofficial: true,
    rejectNoDescription: false,
    rejectNoLinks: true,
    rejectNoLinksIfNoHeading: true,
    updateCoordinates: false,
    updatePanoIDs: false,
    removeNearby: false,
    nearbyRadius: 10,
    headings: {
        filterBy: {
            panned: false,
            unpanned: false,
            panoID: false,
            nonPanoID: false,
        },
        directionBy: {
            1: "forward",
            23: "forward",
            4: "forward",
            DEAD_END: "link",
        },
        range: [0, 0],
        randomInRange: false,
        updatePitch: false,
        pitchDeviation: 0,
    },
});

const areHeadingSettingsGood = computed(
    () =>
        (settings.headings.filterBy.panoID || settings.headings.filterBy.nonPanoID) &&
        (settings.headings.filterBy.panned || settings.headings.filterBy.unpanned)
);

const initialState = {
    loaded: false,
    started: false,
    finished: false,
    step: 0,
    success: 0,
    SVNotFound: 0,
    unofficial: 0,
    noDescription: 0,
    wrongGeneration: 0,
    outOfDateRange: 0,
    isolated: 0,
    tooClose: 0,
};

const state = reactive({ ...initialState });

const customMap = ref({});

let mapToCheck = [];
let resolvedLocs = [];
let rejectedLocs = {
    SVNotFound: [],
    unofficial: [],
    noDescription: [],
    wrongGeneration: [],
    outOfDateRange: [],
    isolated: [],
};
let allRejectedLocs = [];

const resetState = () => {
    Object.assign(state, initialState);
    customMap.value = {};
    mapToCheck.length = 0;
    resolvedLocs.length = 0;
    rejectedLocs = {
        SVNotFound: [],
        unofficial: [],
        noDescription: [],
        wrongGeneration: [],
        outOfDateRange: [],
        isolated: [],
    };
    allRejectedLocs.length = 0;
};

const error = ref("");

// Process
const handleClickStart = () => {
    state.started = true;
    start();
};

const handleRadiusInput = (e) => {
    const value = parseInt(e.target.value);
    if (!value || value < 10) {
        settings.radius = 10;
    } else if (value > 1000) {
        settings.radius = 1000;
    }
};

const handleNearbyRadiusInput = (e) => {
    const value = parseInt(e.target.value);
    if (!value || value < 1) {
        settings.nearbyRadius = 1;
    } else if (value > 10000000) {
        settings.nearbyRadius = 10000000;
    }
};

Array.prototype.chunk = function (n) {
    if (!this.length) {
        return [];
    }
    return [this.slice(0, n)].concat(this.slice(n).chunk(n));
};

const start = async () => {
    const chunkSize = 100;
    for (let locationGroup of mapToCheck.chunk(chunkSize)) {
        const responses = await Promise.allSettled(locationGroup.map((l) => SVreq(l, settings)));
        for (let response of responses) {
            if (response.status === "fulfilled") {
                resolvedLocs.push(response.value);
                state.success++;
            } else {
                switch (response.reason.reason) {
                    case "SV_NOT_FOUND":
                        rejectedLocs.SVNotFound.push(response.reason);
                        state.SVNotFound++;
                        break;
                    case "UNOFFICIAL":
                        rejectedLocs.unofficial.push(response.reason);
                        state.unofficial++;
                        break;
                    case "NO_DESCRIPTION":
                        rejectedLocs.noDescription.push(response.reason);
                        state.noDescription++;
                        break;
                    case "WRONG_GENERATION":
                        rejectedLocs.wrongGeneration.push(response.reason);
                        state.wrongGeneration++;
                        break;
                    case "ISOLATED":
                        rejectedLocs.isolated.push(response.reason);
                        state.isolated++;
                        break;
                    case "OUT_OF_DATE_RANGE":
                        rejectedLocs.outOfDateRange.push(response.reason);
                        state.outOfDateRange++;
                        break;
                }
            }
            state.step++;
        }
    }
    if (settings.removeNearby) {
        const newArr = removeNearby(resolvedLocs, settings.nearbyRadius);
        state.tooClose = resolvedLocs.length - newArr.length;
        resolvedLocs.length = 0;
        resolvedLocs.push(...newArr);
    }

    allRejectedLocs = [
        ...rejectedLocs.SVNotFound,
        ...rejectedLocs.unofficial,
        ...rejectedLocs.noDescription,
        ...rejectedLocs.wrongGeneration,
        ...rejectedLocs.outOfDateRange,
        ...rejectedLocs.isolated,
    ];

    state.finished = true;
};

// Import
document.addEventListener("paste", (evt) => {
    const data = evt.clipboardData.getData("text/plain");
    checkJSON(data);
});

const loadFromJSON = (e) => {
    const files = e.target.files || e.dataTransfer.files;
    if (!files.length) return;
    readFile(files[0]);
};

const readFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        checkJSON(e.target.result);
    };
    reader.readAsText(file);
};

const hasLatLng = (objectArray) =>
    objectArray.every((obj) => obj.hasOwnProperty("lat")) && objectArray.every((obj) => obj.hasOwnProperty("lng"));

const checkJSON = (data) => {
    try {
        let mapData = JSON.parse(data);
        if (mapData.hasOwnProperty("customCoordinates")) {
            mapData = [...mapData.customCoordinates];
        }
        if (!hasLatLng(mapData)) {
            error.value = "Invalid map data";
            state.loaded = false;
            return;
        }

        error.value = "";
        customMap.value = { nbLocs: mapData.length };
        mapToCheck = mapData;
        state.loaded = true;
    } catch (err) {
        state.loaded = false;
        error.value = "Invalid map data";
    }
};

const removeNearby = (arr, radius) => {
    const newArr = [];
    arr.forEach((point) => {
        const hasClosePoint = newArr.some(
            (found) => haversineDistance({ lat: point.lat, lng: point.lng }, { lat: found.lat, lng: found.lng }) < radius
        );
        if (!hasClosePoint) newArr.push(point);
    });
    return newArr;
};

const haversineDistance = (mk1, mk2) => {
    const R = 6371.071;
    const rlat1 = mk1.lat * (Math.PI / 180);
    const rlat2 = mk2.lat * (Math.PI / 180);
    const difflat = rlat2 - rlat1;
    const difflon = (mk2.lng - mk1.lng) * (Math.PI / 180);
    const km =
        2 *
        R *
        Math.asin(
            Math.sqrt(
                Math.sin(difflat / 2) * Math.sin(difflat / 2) +
                    Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)
            )
        );
    return km * 1000;
};

const pluralize = (text, count) => (count > 1 ? text + "s" : text);
</script>

<style>
@import "@/assets/main.css";
@import "@vueform/slider/themes/default.css";

.wrapper {
    margin: 0 auto;
    max-width: 940px;
}

.wrapper__inner {
    border-radius: 0.25rem;
    box-shadow: 0 20px 40px -14px #00000066;
    display: flex;
    flex-direction: column;
    padding: 0.5rem 0.5rem 0 0.5rem;
    background-color: #303030;
    margin-bottom: 0.5rem;
}

.container {
    background: #3a3a3a;
    padding: 0.5em 1em;
    margin-bottom: 0.5em;
}
.content {
    padding: 0.5rem 1.5rem;
}

.input-file {
    display: none;
}
select,
input[type="range"] {
    width: 140px;
}
.slider-tooltip {
    background-color: var(--success);
    color: #000;
    font-size: 0.8rem;
    padding: 0 5px;
}
</style>
