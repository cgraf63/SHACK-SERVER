import express from "express";

const router = express.Router();


let status = [];


router.get("/", (req,res)=>{

    res.json(status);

});



export function setClusterStatus(data){

    status = data;

}



export default router;
