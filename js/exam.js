const questionContainer =
    document.getElementById("questionContainer");

const studentName =
    document.getElementById("studentName");

const student =
    JSON.parse(localStorage.getItem("student"));


// Prevent unauthorized access

if (!student) {

    window.location.href = "index.html";

}


// Display student information

studentName.textContent =
    student.registrationNumber;


// Generate questions

questions.forEach(function (question, index) {

    const questionCard =
        document.createElement("div");

    questionCard.className =
        "question-card";


    const questionTitle =
        document.createElement("p");

    questionTitle.className =
        "question-number";

    questionTitle.textContent =
        `${index + 1}. ${question.question}`;


    questionCard.appendChild(questionTitle);


    question.options.forEach(function (option, optionIndex) {

        const label =
            document.createElement("label");

        label.className =
            "option";


        label.innerHTML = `

            <input
                type="radio"
                name="question-${index}"
                value="${optionIndex}"
            >

            ${option}

        `;


        questionCard.appendChild(label);

    });


    questionContainer.appendChild(questionCard);

});

let timeLeft = 30 * 60;

const timer =
    document.getElementById("timer");


const countdown =
    setInterval(function () {

        const minutes =
            Math.floor(timeLeft / 60);

        const seconds =
            timeLeft % 60;


        timer.textContent =
            `${minutes}:${seconds
                .toString()
                .padStart(2, "0")}`;


        timeLeft--;


        if (timeLeft < 0) {

            clearInterval(countdown);

            submitExam();

        }

    }, 1000);

    const submitButton =
    document.getElementById("submitExam");


submitButton.addEventListener(
    "click",
    submitExam
);


function submitExam() {

    clearInterval(countdown);

    let score = 0;


    questions.forEach(function (question, index) {

        const selected =
            document.querySelector(
                `input[name="question-${index}"]:checked`
            );


        if (
            selected &&
            Number(selected.value) === question.answer
        ) {

            score++;

        }

    });


    localStorage.setItem(
        "examScore",
        score
    );


    window.location.href =
        "result.html";

}