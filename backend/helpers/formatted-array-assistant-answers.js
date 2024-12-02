module.exports = function formattedArray(array) {
    const result = [];

    for (let i = 0; i < array.length; i += 2) {
        const answer = array[i].split(" > ")[1];
        const question = array[i + 1] ? array[i + 1].split(" > ")[1] : "";

        result.push(
            { role: "assistant", content: answer },
            { role: "user", content: question }
        );
    }

    return result;
}
