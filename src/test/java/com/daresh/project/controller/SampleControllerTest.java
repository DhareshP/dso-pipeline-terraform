package com.daresh.project.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SampleController.class) //loads only the web layer
public class SampleControllerTest {

    @Autowired
    private MockMvc mockMvc; //a mock server

    @Test
    void testSampleMethod() throws Exception{
        mockMvc.perform(get("/test")) //simulates http requests
                .andExpect(status().isOk())  //validates the response and returns status code
//                .andExpect(content().string("Application Deployed on AWS EC2"));
                .andExpect(content().string(containsString("Application Deployed")));
    }
}
