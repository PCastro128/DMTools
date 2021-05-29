
let STATE = {
    dc: "",
    groups: [],
    allow_criticals: false,

    save: (callback=() => {}) => {
        chrome.storage.local.set({"dice": STATE}, callback)
    },

    new_group: () => {
        STATE.groups.push({
            amount: 1,
            mod: 0,
            roll_type: "normal",
            results: []
        })
        return STATE["groups"].length
    },

    set_group_field: (group_id, field, value) => {
        group_id = parseInt(group_id)-1
        if (group_id <= STATE["groups"].length) {
            STATE["groups"][group_id][field] = value
        }
    }
};


function get_roll_group(group_id) {
    return $(`
    <div class="border-top border-bottom border-secondary mb-2" id="rollGroup${group_id}">

      <div class="form-group ml-4 mr-4 mt-2 d-flex justify-content-between">
        <span class="form-control form-control-plaintext">Group ${group_id}</span>
        <button class="btn btn-sm btn-link text-danger" id="removeGroup${group_id}">Remove</button>
      </div>

      <table class="ml-3 mr-3">
        <tr>
          <td>

            <div class="form-inline">
              <div class="form-group">
                <span class="form-control form-control-sm form-control-plaintext mr-2">Amount: </span>
              </div>
              <div class="form-group" style="width: 50%">
                <label for="amount${group_id}" hidden>Amt.</label>
                <input id="amount${group_id}" type="number" class="form-control form-control-sm" placeholder="Amt." value="1">
              </div>
            </div>

          </td>
          <td>

            <div class="form-inline text-left">
              <div class="form-group">
                <span class="form-control form-control-sm form-control-plaintext mr-2">Mod: </span>
              </div>
              <div class="form-group ml-1" style="width: 50%">
                <label for="modifier${group_id}" hidden>Mod.</label>
                <input id="modifier${group_id}" type="number"  class="form-control form-control-sm" placeholder="Mod." value="0">
              </div>
            </div>

          </td>
        </tr>
      </table>

      <div class="d-flex justify-content-around mb-0">
        <div class="custom-radio">
          <input type="radio" name="roll-radios-${group_id}" id="rollNormal${group_id}" value="normal" checked>
          <label class="radio-label" for="rollNormal${group_id}">Normal</label>
        </div>
        <div class="custom-radio">
          <input type="radio" name="roll-radios-${group_id}" id="rollAdvantage${group_id}" value="advantage">
          <label class="radio-label" for="rollAdvantage${group_id}">Advantage</label>
        </div>
        <div class="custom-radio">
          <input type="radio" name="roll-radios-${group_id}" id="rollDisadvantage${group_id}" value="disadvantage">
          <label class="radio-label" for="rollDisadvantage${group_id}">Disadvantage</label>
        </div>
      </div>

      <div class="pl-4 pr-4 pb-2 pt-1 border-top">
        <b>Result: </b><span id="resultsCaption${group_id}"></span>
        <div class="mt-1" id="rollResults${group_id}"></div>
      </div>

    </div>`)
}

// --------------------------------------------------------------

function check_amount_field(group_id) {
    let amount_field_id = `#amount${group_id}`
    let value = $(amount_field_id).val()
    if (parseInt(value) < 1) $(amount_field_id).val("1")
}


function add_roll_group() {
    STATE.new_group()
    STATE.save()
    setup_groups()
}


function setup_groups() {
    if (STATE["groups"].length === 0) {
        STATE.new_group()
        STATE.save()
    }
    document.getElementById("groupContainer").innerHTML = "";
    for (let i=0; i < STATE["groups"].length; i++) {
        let group_id = i+1
        setup_single_group(group_id)
    }
}


function setup_single_group(group_id) {
    let group_data = STATE["groups"][group_id-1]
    $("#groupContainer").append(get_roll_group(group_id))
    $(`#amount${group_id}`).val(group_data["amount"])
    $(`#modifier${group_id}`).val(group_data["mod"])
    set_radio_value(group_id, group_data["roll_type"])
    set_results_section(group_id)
    set_group_events(group_id)
}


function set_group_events(group_id) {
    $(`#removeGroup${group_id}`).click(() => remove_roll_group(group_id));
    $(`#amount${group_id}`).on("change", () => {
        check_amount_field(group_id)
        STATE.set_group_field(group_id, "amount", parseInt($(`#amount${group_id}`).val()))
        STATE.save()
    })
    $(`#modifier${group_id}`).on("change", () => {
        STATE.set_group_field(group_id, "mod", parseInt($(`#modifier${group_id}`).val()))
        STATE.save()
        set_results_section(group_id)
    })
    $(`input[type=radio][name=roll-radios-${group_id}]`).on("change", () => {
        let radio_value = get_radio_value(group_id)
        STATE.set_group_field(group_id, "roll_type", radio_value)
        STATE.save()
    })
}


function get_radio_value(group_id) {
    let elements = $(`input[type=radio][name=roll-radios-${group_id}]`)
    for (let i=0; i < elements.length; i++) {
        if (elements[i].checked) {
            let values = ["normal", "advantage", "disadvantage"]
            return values[i]
        }
    }
}


function set_radio_value(group_id, value) {
    let elements = $(`input[type=radio][name=roll-radios-${group_id}]`)
    let index = 0
    if (value === "advantage") {
        index = 1
    } else if (value === "disadvantage") {
        index = 2
    }
    elements[index].checked = true
}


function set_results_section(group_id) {
    let group_data = STATE["groups"][group_id-1]
    document.getElementById(`resultsCaption${group_id}`).innerHTML = ""
    document.getElementById(`rollResults${group_id}`).innerHTML = ""
    let results_section = $(`#rollResults${group_id}`)

    let successes = 0
    let failures = 0

    for (let i = 0; i < group_data["results"].length; i++) {
        let roll = group_data["results"][i]
        let total = roll + group_data["mod"]

        let tag = "span"
        let tag_class = "roll-standard"
        if (roll === 1) tag_class = "roll-standard roll-nat1"
        if (roll === 20) tag_class = "roll-standard roll-nat20"
        if (STATE["dc"] && roll_is_success(roll, group_data["mod"])) {
            tag = "b"
            tag_class += " roll-success"
        }

        let span = $(`<span> </span><${tag} class="${tag_class}">${total}</{$tag}>`)
        results_section.append(span)

        if (roll_is_success(roll, group_data["mod"])) {
            successes++
        } else {
            failures++
        }
    }

    set_results_caption(group_id, successes, failures)
}


function set_results_caption(group_id, successes, failures) {
    if (successes + failures === 0) return
    if (!STATE["dc"]) return

    let results_caption = $(`#resultsCaption${group_id}`)
    let span1 = $(`<span class="roll-standard roll-nat20">${successes} successes</span>`)
    let span2 = $(`<span class="roll-standard roll-nat1">${failures} failures</span>`)

    results_caption.append(span1)
    results_caption.append(span2)
}


// --------------------------------------------------------------


function roll_is_success(roll, mod) {
    let is_success = false
    if (roll+mod >= STATE["dc"]) is_success = true
    if (roll === 1 && STATE["allow_criticals"]) is_success = false
    if (roll === 20 && STATE["allow_criticals"]) is_success = true
    return is_success
}


function remove_roll_group(group_id) {
    $(`#rollGroup${group_id}`).remove()
    STATE["groups"].splice(group_id-1, 1)
    STATE.save()
    setup_groups()
}


function clear_dc() {
    $("#dc").val("")
    STATE["dc"] = ""
    STATE.save()
    setup_groups()
}


function clear_results() {
    for (let i = 0; i < STATE["groups"].length; i++) {
        STATE["groups"][i]["results"] = []
    }
    STATE.save()
    setup_groups()
}


function toggle_allow_criticals() {
    let element = $("#allowCriticals")
    let prev_state = element.attr("data-checked") === ""
    let new_state = ""
    if (prev_state) new_state = null
    element.attr("data-checked", new_state)
    STATE["allow_criticals"] = !prev_state
    STATE.save()
    setup_groups()
}


function roll_dice() {
    for (let i = 0; i < STATE["groups"].length; i++) {
        let rolls = []
        let group_data = STATE["groups"][i]
        for (let j = 0; j < group_data["amount"]; j++) {
            rolls.push(get_roll(group_data["roll_type"]))
        }
        STATE["groups"][i]["results"] = rolls
    }
    STATE.save()
    setup_groups()
}


function get_roll(roll_type) {
    let roll1 = Math.ceil(Math.random() * 20)
    let roll2 = Math.ceil(Math.random() * 20)
    if (roll_type === "advantage") {
        console.log("advantage")
        return Math.max(roll1, roll2)
    }
    else if (roll_type === "disadvantage") {
        console.log("disadvantage")
        return Math.min(roll1, roll2)
    }
    else return roll1
}


function setup_page() {
    setup_storage(() => {
        set_click_events()
        $("#dc").val(STATE["dc"])
        $("#allowCriticals").attr("data-checked", STATE["allow_criticals"] ? "" : undefined)
        setup_groups()
    })
}


function setup_storage(callback=() => {}) {
    chrome.storage.local.get(["dice"], (result) => {
        let data = result.dice;
        if (data !== undefined) {
            if (data.dc !== undefined) STATE["dc"] = data.dc;
            if (data.groups !== undefined) STATE["groups"] = data.groups;
            if (data.allow_criticals !== undefined) STATE["allow_criticals"] = data.allow_criticals;
        }
        STATE.save(callback)
    })
}


function set_click_events() {
    $("#clearDCButton").click(clear_dc);
    $("#dc").on("change", () => {
        STATE["dc"] = parseInt($("#dc").val())
        STATE.save()
        setup_groups()
    })
    $("#addRollGroupButton").click(add_roll_group);
    $("#rollDiceButton").click(roll_dice);
    $("#clearResultsButton").click(clear_results);
    $("#allowCriticals").click(toggle_allow_criticals);
}

// add_roll_group()
// add_roll_group()
window.onload = setup_page;