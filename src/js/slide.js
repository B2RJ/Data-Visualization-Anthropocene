const listFunction = []

$(_=>{ // Appelé quand le doc et load en entié
    // Initialise la visualisation
    $("#prev").hide();    
    displayTemperature()
    listFunction.push(displayTemperature)
    listFunction.push(displayMovement)

})

let index_vizu = 0


// Next Visualisation
function nextVisu() {
    $("#prev").show();
    index_vizu += 1
    loadVisu()
    if (listFunction.length - 1 == index_vizu){
        $("#next").hide()
    }
}

// Prev Visualisation
function prevVisu() {
    $("#next").show();
    index_vizu -= 1
    loadVisu()
    if (0 == index_vizu){
        $("#prev").hide()
    }
}

// Charge une vizu
function loadVisu(){
    $("#content_viz").empty()
    // On charge le prog
    listFunction[index_vizu]()
}