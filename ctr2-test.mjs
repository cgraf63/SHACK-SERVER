import midi from "@julusian/midi";

const input = new midi.Input();

console.log("MIDI inputs:", input.getPortCount());

for (let i = 0; i < input.getPortCount(); i++) {
    console.log(i, input.getPortName(i));
}

input.openPort(1);
input.ignoreTypes(false, false, false);

console.log("Listening on CTR2...");

input.on("message", (deltaTime, message) => {
    console.log("delta:", deltaTime, "message:", message);
});
