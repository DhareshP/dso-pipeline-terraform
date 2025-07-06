package com.daresh.project.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test")
public class SampleController {

    @GetMapping
    public String SampleMethod(){
        return "Application Deployed on AWS EC2";
    }
}
