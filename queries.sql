create table authen(
    u_id serial primary key, 
    username varchar(90) NOT NULL UNIQUE,
    email varchar(50),
    ins_id varchar(50) NOT NULL UNIQUE ,
    dept varchar(50),
    u_pass varchar(70)
)

CREATE TABLE asked_questions (
    q_id INT,
    userid INT,
    PRIMARY KEY (q_id, userid),
    FOREIGN KEY (q_id) REFERENCES question(q_id),
    FOREIGN KEY (userid) REFERENCES authen(u_id)
);


CREATE TABLE answered_questions (
    aid INT,
    userid INT,
    PRIMARY KEY (aid, userid),
    FOREIGN KEY (aid) REFERENCES answer(aid),
    FOREIGN KEY (userid) REFERENCES authen(u_id)
);

create table host(
    pid serial primary key,
    p_name text NOT NULL UNIQUE,
    description text,
    team_size int,
    prereq text,
    dept text,
    uid int,
    status text default 'open'
)

create table workson(
  uid int,
  pid int ,
  primary key(uid,pid)
)

create table joins(
  uid int ,
  pid int ,
  primary key(uid,pid)
)

create table answer(
  aid serial primary key,
  answer text,
  qid int,
  uid int
)
CREATE TABLE question (
  q_id SERIAL PRIMARY KEY,
  title TEXT,
  description TEXT,
  department text,
  topic text,
  userid INTEGER
);




alter table question add foreign key(userid) references authen(u_id);
alter table answer add foreign key(qid) references question(q_id);
alter table answer add foreign key(uid) references authen(u_id);
alter table joins add foreign key(uid) references authen(u_id);
alter table joins add foreign key(pid) references host(pid);
alter table host add foreign key(uid) references authen(u_id);







CREATE OR REPLACE FUNCTION update_host_status() RETURNS TRIGGER AS $$
BEGIN
    -- Update the status to 'closed' if the number of people joined equals the team size
    UPDATE host
    SET status = CASE 
                    WHEN (SELECT COUNT(*) FROM joins WHERE pid = NEW.pid) >= host.team_size THEN 'closed'
                    ELSE 'open'
                 END
    WHERE pid = NEW.pid;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;



CREATE TRIGGER trigger_update_host_status
AFTER INSERT ON joins
FOR EACH ROW
EXECUTE FUNCTION update_host_status();






CREATE OR REPLACE FUNCTION check_project_status() RETURNS TRIGGER AS $$
BEGIN
    -- Check if the project status is 'closed'
    IF (SELECT status FROM host WHERE pid = NEW.pid) = 'closed' THEN
        RAISE EXCEPTION 'Cannot join a closed project.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER before_insert_joins
BEFORE INSERT ON joins
FOR EACH ROW
EXECUTE FUNCTION check_project_status();



CREATE OR REPLACE FUNCTION check_host_not_joining() RETURNS TRIGGER AS $$
BEGIN
    -- Check if the user is trying to join a project they have hosted
    IF EXISTS (
        SELECT 1
        FROM host
        WHERE pid = NEW.pid AND uid = NEW.uid
    ) THEN
        RAISE EXCEPTION 'A user cannot join a project they are hosting.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_on_joins
BEFORE INSERT ON joins
FOR EACH ROW
EXECUTE FUNCTION check_host_not_joining();
