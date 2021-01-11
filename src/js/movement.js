function displayMovement(
    modePresentation = true,
    startYear= "1988",
    endYear = "1992",
    herd = "Hart Ranges" ,
    epsilon = 0.28,
    width = 700,
    height = 400,
    zoomValue = 1 << 13, // Zoom dans l'image
    initialScale = zoomValue,
    initialCenter = [-122.567179, 56.074159],
    colorArrow = "black",
    colorPoint = "#9E7246",
    radius = 1,
    distance = 1
) {
    /*_______________ INITIAL CONFIGURATION _______________*/


    /*----- Graphical global variables -----*/

    
    /*----- Graphical global components -----*/
    const body = d3.select("#content_viz")

    body.append("div")
        .attr("id", "trajectory")
    if (!modePresentation){
        body.append("H1")
            .text("Movement")
    }
    body.append("div")
        .attr("id", "slider")
    body.append("select")
        .attr("id", "herd-names")
    body.append("input")
        .attr("id", "epsilon")
        .attr("type", "number")
        .attr("value", epsilon)
        .attr("min", "0.00")
        .attr("max", "5.00")
        .attr("step", "0.01")
    if (modePresentation){
        body.select("#slider").attr("hidden","")
        body.select("#herd-names").attr("hidden","")
        body.select("#epsilon").attr("hidden","")
    }
    // let all = body.append("div")
    // all.append("input")
    //     .attr("type","checkbox")
    //     .attr("id","all")
    //     .attr("name","all")
    // all.append("label")
    //     .attr("for","all")
    //     .text("All")


    const svg = d3.select("#trajectory")
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
        .attr('width', width)
        .attr('height', height)
    // Création d'un graphique dans le svg
    let image = svg.append("g")
        .attr("pointer-events", "none") // Supprime l'event de clique sur le graphique
        .selectAll("image") // Setup les image mais pas encore créées

    const sliderSvg = d3.select("#slider")
        .append('svg')
        .attr('width', width)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(20,20)')
    let slider

    const herdList = d3.select("#herd-names")


    /*----- D3JS Setup (params, events, etc.) -----*/

    // Setup de la projection (mercator, coordonnées polaires --> coordonnées cartésiennes)
    const projection = d3.geoMercator()
        .scale(1 / (2 * Math.PI))
        .translate([0, 0])

    // Setup du nombre de pavé present dans l'image et leur taille
    const tile = d3.tile()
        .extent([[0, 0], [width, height]])
        .tileSize(200)

    // Définition de l'échelle de zoom (min/max), de sa taille et de l'event associé
    const zoom = d3.zoom()
        .scaleExtent([zoomValue, zoomValue])
        .extent([[0, 0], [width, height]])
        .on("zoom", ({ transform }) => zoomed(transform))

    const zoomTransform = d3.zoomIdentity // Appel à l'évenement
        .translate(width / 2, height / 2)
        .scale(-initialScale)
        .translate(...projection(initialCenter))
        .scale(-1)



    /*_______________ DATA LOADING & HANDLING _______________*/


    /*----- Global variables -----*/

    let alreadyInitZoomed = false
    let fetchedData = []
    let firstDateRows = []

    const arrowHeadWidth = 12, arrowHeadHeight = arrowHeadWidth
    const arrowPoints = [[2, 2], [10, 6], [2, 10], [6, 6], [2, 2]]

    // const csvUrl = "https://raw.githubusercontent.com/B2RJ/Data-Visualization-Anthropocene/main/data/ourdata/location_means.csv"

    const csvUrl = "https://raw.githubusercontent.com/B2RJ/Data-Visualization-Anthropocene/main/data/ourdata/location_means_years.csv"


    /*----- Main process -----*/

    // Load plain csv data from repo
    d3.csv(csvUrl).then(function (data) {
        fetchedData = data
        createSelectList(data, getHerdNames(data))
        updateSlider(getDatesByHerdName(data, herdList.node().value))

        svg
            .call(zoom) // Setup de l'event de gestion du zoom
            .on("dblclick.zoom", null)
            .on("mousedown.zoom", null)
            .on("touchstart.zoom", null)
            .on("touchmove.zoom", null)
            .on("touchend.zoom", null)
            .call(zoom.transform, zoomTransform) // Placement de la vue aux coordonnées choisies
    })


    // Initialize or update the map when zooming/moving on map
    function zoomed(transform) {
        // On récupère le numéro des pavés en fonction du context de la view (position et niveau de zoom)
        const tiles = tile(transform)

        // On crée/actualise les images présentes dans le graphique
        // Chaque image représente une portion de carte et chaque image est un pavé
        image = image.data(tiles, d => d).join("image")
            .attr("xlink:href", d => url(...d))
            .attr("x", ([x]) => (x + tiles.translate[0]) * tiles.scale)
            .attr("y", ([, y]) => (y + tiles.translate[1]) * tiles.scale)
            .attr("width", tiles.scale)
            .attr("height", tiles.scale)

        projection
            .scale(transform.k / (2 * Math.PI))
            .translate([transform.x, transform.y])

        let points = toCoordonnateofYear(
            getOneHerd(fetchedData, herdList.node().value),
            getRangedYears()[0]
        )
        let center = []
        if (points.length > 2) {
            center = d3.polygonCentroid(d3.polygonHull(points))
        } else {
            center.push((points[0][0] + points[1][0]) / 2)
            center.push((points[0][1] + points[1][1]) / 2)
        }
        let diametre = maxDist(points)
        distance = diametre

        let circles = svg.selectAll("circle")
            .data(toCoordonnateofYear(
                getOneHerd(fetchedData, herdList.node().value),
                getRangedYears()[0]
            ))

        let lines = getLinesData(fetchedData, herdList.node().value, getRangedYears())
        lines = centerLines(lines, center)

        if (alreadyInitZoomed) { // UPDATES
            svg.selectAll(".line").remove()
            svg.selectAll("path").data(lines)
                .enter()
                .append("path")
                .attr("class", "line")
                .attr("marker-end", "url(#arrow)")
                .attr("d", d3.line()
                    .x(d => projection(d)[0])
                    .y(d => projection(d)[1]))
                .style("stroke", colorArrow)
                .style("stroke-linecap", "round")

        } else { // INITIALIZATION
            svg
                .append("circle")
                .attr("cx", d => projection(center)[0])
                .attr("cy", d => projection(center)[1])
                // .attr("r", 20)
                .attr("r", 3)
                .attr("id", "drawc")
                // .style("stroke", "black")
                .style("fill", "black")
            // .attr("opacity", 0.2)


            svg.selectAll("path").data(lines)
                .enter()
                .append("path")
                .attr("class", "line")
                .attr("marker-end", "url(#arrow)")
                .attr("d", d3.line()
                    .x(d => projection(d)[0])
                    .y(d => projection(d)[1]))
                .style("stroke", colorArrow)
                .style("stroke-linecap", "round")

            // console.log(getOneHerd(fetchedData,herdList.node().value))

            svg
                .append("defs")
                .append("marker")
                .attr("id", "arrow")
                .attr("viewBox", [0, 0, arrowHeadWidth, arrowHeadHeight])
                .attr("refX", arrowHeadWidth / 2)
                .attr("refY", arrowHeadHeight / 2)
                .attr("markerWidth", arrowHeadWidth)
                .attr("markerHeight", arrowHeadHeight)
                .attr("orient", "auto")
                .append("path")
                .attr("d", d3.line()(arrowPoints))
                .style("fill", colorArrow)

            alreadyInitZoomed = true
        }

        circles.enter()
            .append("circle")
            .merge(circles)
            .attr("cx", d => projection(d)[0])
            .attr("cy", d => projection(d)[1])
            .attr("r", radius)
            .attr("fill", colorPoint)
            .attr("opacity", 0)

        svg.select("#drawc")
            .attr("cx", d => projection(center)[0])
            .attr("cy", d => projection(center)[1])
            .attr("r", 3)
    }

    // // Initialize or update the slider when zooming/moving on map
    function updateSlider(years) {
        const minYear = years[0]
        const maxYear = years[years.length - 1]
        if (alreadyInitZoomed) {
            sliderSvg
                .call(slider
                    .domain([minYear, maxYear])
                    .tickValues(years)
                    .marks(years)
                    .value([minYear, maxYear])
                    .default([new Date(startYear),new Date(endYear)])
                )
        } else {
            slider = d3
                .sliderBottom()
                .domain([minYear, maxYear])
                .width(650)
                .tickValues(years)
                .marks(years)
                .tickFormat(d3.timeFormat('%Y'))
                .fill("grey")
                .value([minYear, maxYear])
                .default([new Date(startYear),new Date(endYear)])
                .on("end", (dates) => {
                    svg.call(zoom.transform, zoomTransform)
                })

            sliderSvg
                .call(slider)
        }
    }

    // Create the select list for multiple herd names
    function createSelectList(data, names) {
        herdList
            .selectAll("option")
            .data(names)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d)
        herdList.on("change", () => {
            updateSlider(getDatesByHerdName(data, herdList.node().value))
            svg.call(zoom.transform, zoomTransform)
        })
        .attr("value",herd)
        d3.select("#epsilon") // event quand on change la valeur d'epsilon
            .on("change", () => {
                updateSlider(getDatesByHerdName(data, herdList.node().value))
                svg.call(zoom.transform, zoomTransform)
            })
    }



    /*_______________ UTILS FUNCTIONS _______________*/
    // Retourn tous les lieux d'étude
    function getHerdNames(data) {
        return [...new Set(data.map(elem => elem.study_site))]
    }

    // Retourne la liste des années présentes dans la base pour une race donnée
    function getDatesByHerdName(data, herdName) {
        years = getOneHerd(data, herdName).map(elem => new Date(elem.year))
        return [...new Set(years)]
    }

    // Retourne les animaux qui sont de la race donnée
    function getOneHerd(data, herdName) {
        return data.filter(elem => elem.study_site == herdName)
    }

    // Retourne les bornes des années
    function getRangedYears() {
        return slider.value().map(date => new Date(date).getFullYear())
    }

    //
    function toCoordonnateofYear(data, year) {
        let result = []
        for (let i in data) {
            if (data[i].year == year) {
                result.push(
                    [Number(data[i].longitude), Number(data[i].latitude)]
                )
            }
        }
        return result
    }

    function maxDist(points) {
        let maxd = 0
        for (let p1 of points) {
            for (let p2 of points) {
                let dist = Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2))
                if (dist > maxd) {
                    maxd = dist
                }
            }
        }
        return maxd
    }

    function centerLines(lines, center) {
        for (let line of lines) {
            if (line.length == 0) { continue }
            let difx = line[0][0] - center[0]
            let dify = line[0][1] - center[1]
            line[0] = center
            line[1][0] -= difx
            line[1][1] -= dify
        }
        return lines
    }

    // Retourne les coordonnée de départ 
    function getLinesData(data, herdName, rangeYear) {
        let selectionMin = data.filter(elem => elem.study_site == herdName && elem.year == rangeYear[0])
        const animal_idsMin = selectionMin.map(elem => elem.animal_id)
        let selectionMax = data.filter(elem => elem.study_site == herdName && elem.year == rangeYear[1])
        const animal_idsMAX = selectionMax.map(elem => elem.animal_id)
        const intersect = animal_idsMin.filter(value => animal_idsMAX.includes(value));
        selectionMin = selectionMin.filter(elem => intersect.includes(elem.animal_id));
        selectionMax = selectionMax.filter(elem => intersect.includes(elem.animal_id));

        let result = []
        for (let i in selectionMin) {
            result.push([
                [Number(selectionMin[i].longitude), Number(selectionMin[i].latitude)],
                [Number(selectionMax[i].longitude), Number(selectionMax[i].latitude)]
            ])
        }
        const epsilon = d3.select("#epsilon").node().value

        const agrandissement = 1
        let tmp = [[]]
        let remove = []
        for (let i in result) {
            if (remove.indexOf(JSON.stringify(result[i][0])) != -1) { continue }
            let vec1 = [result[i][1][0] - result[i][0][0], result[i][1][1] - result[i][0][1]]
            tmp.push(result[i])

            let vecCompact = 0
            for (let j in result) {
                if (i == j) { continue }
                if (remove.indexOf(JSON.stringify(result[j][0])) != -1) { continue }
                let vec2 = [result[j][1][0] - result[j][0][0], result[j][1][1] - result[j][0][1]]
                // console.log(Math.abs(vec1[0] - vec2[0]), Math.abs(vec1[1] - vec2[1]))
                // Même direction de déplacement
                if (Math.abs(vec1[0] - vec2[0]) <= epsilon && Math.abs(vec1[1] - vec2[1]) <= epsilon) {
                    vecCompact += 1
                    remove.push(JSON.stringify(result[j][0]))
                }
            }
            // On set la taille du vecteur
            let value = agrandissement * (vecCompact / result.length)
            tmp[tmp.length - 1][1][0] += (value) * (tmp[tmp.length - 1][1][0] > 0 ? 1 : -1)
            tmp[tmp.length - 1][1][1] += (value) * (tmp[tmp.length - 1][1][1] > 0 ? 1 : -1)
        }
        return tmp
    }

    // Retourne l'adresse de télechargement d'un pavé
    function url(x, y, z) {
        return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/${z}/${x}/${y}${devicePixelRatio > 1 ? "@2x" : ""}?access_token=pk.eyJ1IjoicGF3YXJvIiwiYSI6ImNramI5NDIyMDdqMGYydnBkeGVrcGNydDUifQ.k7aT1uH2iIZEAnUC38-QJw`
    }
}