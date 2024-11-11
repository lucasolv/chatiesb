module.exports = function formattedArray(array) {
    const result = [];

    for (let i = 0; i < array.length; i += 2) {
        const question = array[i].split(" > ")[1];
        const answer = array[i + 1] ? array[i + 1].split(" > ")[1] : "";

        result.push(
            { role: "user", content: question },
            { role: "assistant", content: answer }
        );
    }

    return result;
}
