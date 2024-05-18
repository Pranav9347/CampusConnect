import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;
const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "campus_connect",
    password: "adithya",
    port: 5432,
});
db.connect();

var l_user, l_pass;
var r_user, email, id, r_pass, dept;

const salt = 10;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.get("/", (req, res) => {
    res.render("main.ejs");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});


app.get("/collaborate", (req, res) => {
    res.render("collaborate.ejs");
});
app.get("/host", (req, res) => {
    res.sendFile(__dirname + "/public/host.html");
});


app.get("/ask", (req, res) => {
    res.sendFile(__dirname + "/public/ask.html");
});

app.post("/login", async (req, res) => {
    l_user = req.body.username;
    l_pass = req.body.password;
    try {
        const checkres = await db.query("select * from authen where username = $1", [l_user]);
        if (checkres.rowCount > 0) {
            const username = checkres.rows[0];
            const storedpass = username.u_pass;
            const match = await bcrypt.compare(l_pass, storedpass);
            if (match) {
                const id = await db.query("select u_id from authen where username = $1 ", [l_user]);
                const uid = id.rows[0];
                const user_id = uid.u_id;
                const result = await db.query("select * from question limit 3");
                const result1 = await db.query("select * from host limit 3");
                const question = result.rows;
                const project = result1.rows;
                res.render("home.ejs",
                    {
                        Uid:user_id,
                        Question:question,
                        Project:project
                    }
                );
            } else {
                res.send("Incorrect Password");
            }
        } else {
            res.send("User not found");
        }
    } catch (err) {
        console.log(err);
    }
});
app.post("/register", async (req, res) => {
    r_user = req.body.username;
    email = req.body.email;
    id = req.body.instituteid;
    dept = req.body.department;
    r_pass = req.body.password;

    try {
        const check = await db.query("select * from authen where username = $1", [r_user]);
        if (check.rowCount > 0) {
            res.send("User already exists:, Try logging in ");
        } else {
            const hashedpass = await bcrypt.hash(r_pass, salt);
            const result = await db.query("insert into authen (username, email, ins_id, dept, u_pass) values ($1, $2, $3, $4, $5)", [r_user, email, id, dept, hashedpass]);
            res.render("login.ejs");
        }
    } catch (err) {
        console.log(err);
    }
});

app.get("/home", async(req, res) => {
    const id = await db.query("select u_id from authen where username = $1 ", [l_user]);
                const uid = id.rows[0];
                const user_id = uid.u_id;
                const result = await db.query("select * from question limit 3");
                const result1 = await db.query("select * from host limit 3");
                const question = result.rows;
                const project = result1.rows;
                res.render("home.ejs",
                    {
                        Uid:user_id,
                        Question:question,
                        Project:project
                    }
                );
});

app.post("/hostsubmit", async (req, res) => {
    const pname = req.body.name;
    const pdesc = req.body.description;
    const psize = req.body.max_size;
    const preq = req.body.prerequisites;
    const pdept = req.body.department;

    try {
        const idResult = await db.query("SELECT u_id FROM authen WHERE username = $1", [l_user]);
        const uid = idResult.rows[0].u_id;

        // Insert the project into the host table
        const hostResult = await db.query("INSERT INTO host (p_name, description, team_size, prereq, dept, uid) VALUES ($1, $2, $3, $4, $5, $6) RETURNING pid",
            [pname, pdesc, psize, preq, pdept, uid]);

        const pid = hostResult.rows[0].pid; // Get the project ID

        // Insert into workson table
        await db.query("INSERT INTO workson (uid, pid) VALUES ($1, $2)", [uid, pid]);

        res.render("collaborate.ejs");
    } catch (err) {
        console.log(err);
    }
});

app.get("/discuss", async (req, res) => {
    const result = await db.query("select * from question limit 10");
    const questions = result.rows;
    res.render("discusshome.ejs", {
        name: l_user,
        Question: questions
    });
});

app.get("/history",(req,res)=>
{   
    res.render("projhistory.ejs");

});
app.get("/discusshistory",(req,res)=>
{   
    res.render("discusshistory.ejs");

});
app.get("/projectjoined",async(req,res)=>
{   
    const username = l_user;
    const id = await db.query("select u_id from authen where username = $1 ", [l_user]);
    const uid = id.rows[0];
    const user_id = uid.u_id;

    const result = await db.query("select * from host h join workson w on h.uid = w.uid  where w.uid = $1",[user_id]);
    const project = result.rows;
    res.render("projhistory.ejs",
        {
            name:l_user,
            Project:project
        }
    
    );
   
});
app.get("/questionasked",async(req,res)=>
{
    const username = l_user;
    const id = await db.query("select u_id from authen where username = $1 ", [l_user]);
    const uid = id.rows[0];
    const user_id = uid.u_id;

    const result = await db.query("select * from question q join asked_questions a on a.userid = q.userid where a.userid = $1",[user_id]);
    const questions = result.rows;

    res.render("discusshistory.ejs",
        {
            name : l_user,
            Question:questions
        }
    );
});

app.get("/answeredq",async(req,res)=>    
{
    const username = l_user;
    const id = await db.query("select u_id from authen where username = $1 ", [l_user]);
    const uid = id.rows[0];
    const user_id = uid.u_id;    
    
    const result = await db.query("select q.q_id ,q.title,q.topic, q.description from question q join answer a on a.qid = q.q_id join answered_questions aq on aq.aid = a.aid where a.uid = $1 ",[user_id]);
    const fresult = result.rows;

    res.render("discusshistory.ejs",
        {
            name:l_user,
            Question:fresult
        }
    )

});



app.get("/projecthosted",async(req,res)=>
{
    const username = l_user;
    const id = await db.query("select u_id from authen where username = $1 ", [l_user]);
    const uid = id.rows[0];
    const user_id = uid.u_id;

    const result = await db.query("select * from host where uid = $1",[user_id]);
    const project  = result.rows;

    res.render("projhistory.ejs",
        {
            name:l_user,
            Project:project
        }
    
    );

});

app.get("/join", async(req, res) => {
    const id = await db.query("select u_id from authen where username = $1 ", [l_user]);
    const uid = id.rows[0];
    const user_id = uid.u_id;

    const result = await db.query("Select * from host where status = 'open' and pid not in (select pid from joins where uid =$1 ) and uid <> $1  ",[user_id]);
    const project = result.rows;
    res.render("join.ejs",
        {
            name:l_user,
            Project:project
        }
    );
});

app.get("/questionDetail", (req, res) => {
    const { id,title,topic,description } = req.query;
    res.render("questiondetail.ejs", { id,title,topic,description });
});
app.get("/projectdetail",(req,res)=>{
    const {id,name,desc,size,preq,dept,uid} = req.query;
    res.render("projectdetail.ejs",{id,name,desc,size,preq,dept,uid});
});

app.get("/checkans",async(req,res)=>
{
    const{id,title,topic,desc} = req.query;
    // res.render("checkans.ejs",{id,title,topic,desc});
    const username = l_user;
    const result  = await db.query("select answer ,uid from answer  where qid = $1",[id]);
    const answer = result.rows;

    res.render("checkans.ejs",
        {
            id,
            title,
            topic,
            desc,
            Ans :answer
        }
    );
});
app.get("/profile", async (req, res) => {
    const result = await db.query("select * from authen where username = $1", [l_user]);
    const s_user = result.rows[0];
    const s_name = s_user.username;
    const s_pass = s_user.u_pass;
    const s_email = s_user.email;
    const s_id = s_user.ins_id;
    const s_dept = s_user.dept;
    const s_userid = s_user.u_id;
    res.render("profile.ejs", {
        userId: s_userid,
        username: s_name,
        Email: s_email,
        instituteid: s_id,
        password: s_pass,
        department: s_dept
    });
    console.log(s_userid);
});

app.post("/discusssubmit", async (req, res) => {
    const username = l_user;
    const Dept = req.body.department;
    const Topic = req.body.topic;

    const result = await db.query("select * from question where department = $1 and topic like $2",[Dept,`%${Topic}%`]);
    const questions = result.rows;

    res.render("discusshome.ejs", {
        name:username,
        department: Dept,
        Question: questions
    });
});

app.post("/joinsubmit",async(req,res)=>
{
    const username = l_user;
    const dept = req.body.department;
    const id = await db.query("select u_id from authen where username = $1 ", [l_user]);
    const uid = id.rows[0];
    const user_id = uid.u_id;


    const result = await db.query("Select * from host where dept = $1 and status = 'open' and pid not in (select pid from joins where uid =$2 ) and uid <> $2  ",[dept,user_id]);
    const project = result.rows;

    res.render("join.ejs",
        {
            name : username,
            department:dept,
            Project:project
        }
    );
});

app.post("/answersubmit",async(req,res)=>
{
    const username = l_user;
    const qid = req.body.questionId;
    const answer = req.body.answer;
    const id = await db.query("select u_id from authen where username = $1 ", [l_user]);
    const uid = id.rows[0];
    const user_id = uid.u_id;
    const result = await db.query("insert into answer (answer , qid , uid) values ($1,$2,$3) RETURNING aid",[answer,qid,user_id]);
    const aid = result.rows[0].aid;

    await db.query("insert into answered_questions (aid , userid) values ($1,$2)",[aid,user_id]);

    const nresult = await db.query("select * from question limit 10");
    const questions = nresult.rows;
    res.render("discusshome.ejs", {
        name: l_user,
        Question: questions
    });
});

app.get("/joinproject", async(req,res)=>
{
    try {
        const id = await db.query("select u_id from authen where username = $1 ", [l_user]);
        const uid = id.rows[0];
        const user_id = uid.u_id;

        const {pid} = req.query;
        console.log(user_id);
        console.log(pid);

        const result = await db.query("insert into joins (uid,pid) values ($1,$2)",[user_id,pid]);
        
        await db.query("insert into workson (uid, pid) VALUES ($1, $2)",[user_id,pid]);
        const nresult = await db.query("Select * from host where status = 'open' and pid not in (select pid from joins where uid =$1 ) and uid <> $1  ",[user_id]);
        const project = nresult.rows;
        res.render("join.ejs",
            {
                name:l_user,
                Project:project
            }
        );

    } catch (err) {
        console.log(err);
        
    }

});
app.post("/asksubmit", async (req, res) => {
    const Title = req.body.title;
    const Topic = req.body.topic;
    const Description = req.body.description;
    const Department = req.body.department;

    try {
        const id = await db.query("select u_id from authen where username = $1 ", [l_user]);
        const uid = id.rows[0];
        const user_id = uid.u_id;
        const result = await db.query("insert into question (title, description, department, topic, userid) values ($1, $2, $3, $4, $5) RETURNING q_id", [Title, Description, Department, Topic, user_id]);
        const q_id = result.rows[0].q_id;
        await db.query("insert into asked_questions (q_id , userid) values ($1,$2)",[q_id,user_id]);
        const nresult = await db.query("select * from question limit 10");
        const questions = nresult.rows;

        res.render("discusshome.ejs", {
            name: l_user,
            Question: questions
        });
    } catch (err) {
        console.log(err);
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});