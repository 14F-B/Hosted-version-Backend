const connection = require('../config/db');

const events = {
    getAll(req,res){
        let sql = 'select * from locations';
        connection.query(sql,(err,data)=>{
            if (err){
                res.status(500).send({
                    message: err.message || 'Unknow error'
                })
            }else {
                res.send(data);
            }
        });
    },
    getProperties(req,res){
        let sql = `SELECT eventproperties.id, eventproperties.name, eventproperties.date,DATE_FORMAT(eventproperties.date, '%Y.%m.%d %H:%i') AS formatted_date, eventproperties.agelimit, eventproperties.url_link, eventproperties.description,
                   eventproperties.loc_id, locations.city, locations.street, locations.house_number, 
                   locations.capacity, locations.applied, performers.name as performer_name 
                   FROM eventproperties JOIN locations ON eventproperties.loc_id = locations.id 
                   JOIN events_perfomers ON eventproperties.id = events_perfomers.events_id 
                   JOIN performers ON events_perfomers.performs_id = performers.id WHERE eventproperties.date > NOW() ORDER BY eventproperties.date ASC;`
        connection.query(sql,(err,data)=>{
            if (err){
                res.status(500).send({
                    message: err.message || 'Unknow error'
                })
            }
            else {
                res.send(data);
            }
        });
    }
}



function validate(req,res){    
    if (JSON.stringify(req.body) == '{}'){
        res.status(400).send({
            message : 'Content can not be empty!'
        });
        return true;
    }
    if (req.body.title == ''){
        res.status(400).send({
            message : 'Title required!'
        });
        return true;
    }
    if (req.body.description == ''){
        res.status(400).send({
            message : 'Title description!'
        });
        return true;
    }


    return false;
}

module.exports = events;