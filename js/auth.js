const authForm = document.getElementById("authForm");
const authMessage = document.getElementById("authMessage");

const students = [
    {
        email: "student1@example.com",
        registrationNumber: "OOP/CS/001",
        department: "Computer Science",
        examCode: "OOP2026"
    },

    {
        email: "student2@example.com",
        registrationNumber: "OOP/CS/002",
        department: "Computer Science",
        examCode: "OOP2026"
    }
];

authForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const registrationNumber =
        document.getElementById("regNumber").value.trim();

    const department =
        document.getElementById("department").value;

    const examCode =
        document.getElementById("examCode").value.trim();

    const student = students.find(function (student) {

        return (
            student.email === email &&
            student.registrationNumber === registrationNumber &&
            student.department === department &&
            student.examCode === examCode
        );

    });

    if (student) {

        localStorage.setItem(
            "student",
            JSON.stringify(student)
        );

        window.location.href = "exam.html";

    } else {

        authMessage.textContent =
            "Invalid examination credentials.";

        authMessage.style.color = "red";
    }

});