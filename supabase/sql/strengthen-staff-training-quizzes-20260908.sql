-- Adds five scenario-based questions to each live module. Guard prevents duplicates.
with additions(module_key, extra) as (values
('allergens',$$[
 {"id":101,"question":"A regular supplier changes a sauce recipe during a busy service. What is the safest response?","options":["Keep using last week's allergen sheet","Pause allergen advice until the current label and recipe record are checked","Ask whether the customer has eaten it before","Remove the sauce name from the menu"],"correct_index":1},
 {"id":102,"question":"A customer says a tiny amount of allergen will be fine. What should staff do?","options":["Follow the customer's guess","Use the approved allergen procedure and accurate current information","Serve it if a manager is unavailable","Remove visible pieces only"],"correct_index":1},
 {"id":103,"question":"Which combination best controls allergen cross-contact?","options":["Fresh gloves only","A clean area, clean equipment, correct ingredients and verified procedure","Cooking for longer","A verbal warning after service"],"correct_index":1},
 {"id":104,"question":"You cannot verify whether an ingredient contains an allergen. What should you tell the customer?","options":["It is probably safe","That you cannot confirm it is safe and must not guess","That cooking makes it safe","That the supplier is responsible"],"correct_index":1},
 {"id":105,"question":"An allergen order is changed after preparation starts. What is the best action?","options":["Pick off the changed ingredient","Stop and restart under the approved procedure if safety cannot be assured","Wipe the plate","Serve both versions"],"correct_index":1}
]$$::jsonb),
('food_safety_cross_contamination',$$[
 {"id":101,"question":"Raw chicken packaging touches a ready-to-eat preparation bench. What should happen first?","options":["Cover it with paper","Stop using the area and clean/disinfect it using the approved method","Wait until the end of service","Move food to the other side"],"correct_index":1},
 {"id":102,"question":"Which is the strongest control when changing from raw to ready-to-eat work?","options":["Changing gloves only","Approved separation plus effective cleaning, handwashing and clean equipment","Working faster","Using the same board upside down"],"correct_index":1},
 {"id":103,"question":"A food-safety check was missed. Which record is appropriate?","options":["Invent a normal reading","Record the missed check and the corrective action honestly","Leave the form blank without telling anyone","Copy yesterday's result"],"correct_index":1},
 {"id":104,"question":"Why are cleaning cloths a possible contamination route?","options":["They can transfer contamination between surfaces","They cool food","They change cooking times","They only affect appearance"],"correct_index":0},
 {"id":105,"question":"A ready-to-eat item may have been contaminated. What is the best response?","options":["Serve it immediately","Isolate it, tell the responsible person and follow the corrective-action procedure","Rinse it","Mix it with a fresh batch"],"correct_index":1}
]$$::jsonb),
('temperature_control',$$[
 {"id":101,"question":"A fridge reading is outside Dexter's approved limit. What is the complete response?","options":["Adjust the display only","Verify the reading, protect the food, take corrective action and record it","Delete the check","Move the thermometer"],"correct_index":1},
 {"id":102,"question":"Why should a probe be checked for accuracy?","options":["So unsafe readings are not accepted as reliable","To make food cook faster","To avoid cleaning it","Only for customer appearance"],"correct_index":0},
 {"id":103,"question":"Hot food has been left outside control and its safety cannot be established. What should staff do?","options":["Reheat it and assume it is safe","Escalate and follow the approved disposal/corrective procedure","Mix it with hotter food","Change the recorded time"],"correct_index":1},
 {"id":104,"question":"Which matters when checking chilled storage?","options":["Only the display temperature","The approved limit, actual food safety, duration and corrective action","The colour of the fridge","Whether service is busy"],"correct_index":1},
 {"id":105,"question":"A probe gives an unexpected result. What is the best next step?","options":["Record a preferred number","Repeat correctly with a clean probe and escalate if still outside limits","Ignore it once","Warm the probe by hand"],"correct_index":1}
]$$::jsonb),
('handwashing',$$[
 {"id":101,"question":"After taking rubbish out, a worker puts on gloves and returns to food preparation. What is missing?","options":["A new apron only","Thorough handwashing before clean gloves and food work","A temperature check","Nothing"],"correct_index":1},
 {"id":102,"question":"Which areas are commonly missed during handwashing?","options":["Thumbs, fingertips, between fingers and backs of hands","Palms only","Wrists only","Sleeves"],"correct_index":0},
 {"id":103,"question":"A handwash basin is blocked by equipment. What should happen?","options":["Use the food sink routinely","Restore access and report/escalate the obstruction","Use sanitiser instead all day","Wait until closing"],"correct_index":1},
 {"id":104,"question":"When is hand sanitiser an acceptable replacement for proper handwashing in normal food handling?","options":["Whenever gloves are used","It is not a routine replacement for proper handwashing","During busy periods","After raw chicken"],"correct_index":1},
 {"id":105,"question":"A worker touches their phone while preparing food. What should happen before resuming?","options":["Wipe the phone on clothing","Wash hands properly and restore a clean working state","Change only the utensil","Continue if the phone looks clean"],"correct_index":1}
]$$::jsonb),
('personal_hygiene_illness',$$[
 {"id":101,"question":"A food handler's vomiting stopped yesterday morning. What information is most important before returning to food work?","options":["Whether the shift is short staffed","Whether the required symptom-free period and management clearance are complete","Whether they feel hungry","Whether gloves are available"],"correct_index":1},
 {"id":102,"question":"A worker has an infected cut on a hand. What is the correct response?","options":["Hide it under a sleeve","Report it and apply the approved exclusion/protective controls","Use two ordinary gloves without reporting","Work only with cold food"],"correct_index":1},
 {"id":103,"question":"Why must illness be reported promptly?","options":["So contamination risk can be assessed and controlled","Only to change payroll","To avoid completing a rota","For appearance"],"correct_index":0},
 {"id":104,"question":"Which behaviour creates a hygiene risk?","options":["Changing clean protective clothing","Touching face/hair then continuing food preparation without washing hands","Reporting a damaged dressing","Using the handwash basin"],"correct_index":1},
 {"id":105,"question":"A colleague asks you not to report their diarrhoea. What should you do?","options":["Agree if they avoid salads","Ensure it is reported immediately under the illness procedure","Wait for a customer complaint","Let them work with gloves"],"correct_index":1}
]$$::jsonb),
('coshh_cleaning_chemicals',$$[
 {"id":101,"question":"A cleaner has been moved into an unlabelled spray bottle. What is the safest action?","options":["Smell it to identify it","Do not use it; isolate and report it under the chemical procedure","Add water and use it","Write 'cleaner' on it from memory"],"correct_index":1},
 {"id":102,"question":"What should a COSHH assessment consider?","options":["Hazard, exposure, controls, storage and emergency action","Price only","Colour and smell","Only whether gloves exist"],"correct_index":0},
 {"id":103,"question":"A chemical splashes into someone's eye. What should guide the response?","options":["A social-media tip","The product's approved emergency/first-aid instructions and immediate escalation","Waiting for symptoms","Covering the eye and finishing work"],"correct_index":1},
 {"id":104,"question":"Why is the correct dilution important?","options":["It supports effective use while controlling exposure and damage","Stronger is always safer","It changes the bottle colour","It removes the need for training"],"correct_index":0},
 {"id":105,"question":"A worker develops repeated sore, cracked skin from wet work. What should happen?","options":["Ignore it until annual review","Report it early so exposure and controls can be reviewed","Use more chemical","Wear the same wet gloves longer"],"correct_index":1}
]$$::jsonb),
('fire_emergency',$$[
 {"id":101,"question":"Smoke is found near an exit route. What is the priority?","options":["Investigate alone","Raise the alarm/follow the emergency procedure and use a safe route","Collect personal belongings","Finish the current order"],"correct_index":1},
 {"id":102,"question":"At the assembly point, a colleague appears missing. What should you do?","options":["Re-enter to search","Tell the responsible fire marshal/emergency service and do not re-enter","Leave without telling anyone","Phone them from inside"],"correct_index":1},
 {"id":103,"question":"Why must fire doors and escape routes remain clear?","options":["To protect safe evacuation and fire controls","For delivery convenience","Only during inspections","To improve decoration"],"correct_index":0},
 {"id":104,"question":"When may a worker use firefighting equipment?","options":["Whenever a fire looks small","Only when trained/authorised, safe, and with a clear escape route","After blocking the exit","Instead of raising the alarm"],"correct_index":1},
 {"id":105,"question":"A fire-safety device appears damaged. What is the correct action?","options":["Test it during service","Report/escalate it immediately and follow the site procedure","Remove it","Wait for the next drill"],"correct_index":1}
]$$::jsonb),
('manual_handling',$$[
 {"id":101,"question":"A delivery is heavier and less stable than expected. What should you do?","options":["Lift it quickly before it slips","Stop, reassess and use an aid, split load or get suitable help","Twist while lifting","Drag it across the floor"],"correct_index":1},
 {"id":102,"question":"Which assessment is most complete?","options":["Weight only","Task, load, environment and individual capability","Worker age only","Distance only"],"correct_index":1},
 {"id":103,"question":"A route has a wet floor and a closed door. What should happen before moving the load?","options":["Carry it at arm's length","Control the floor risk and plan/clear the route","Walk backwards","Move faster"],"correct_index":1},
 {"id":104,"question":"Why should a load usually be kept close to the body?","options":["It can reduce strain and improve control","It makes it heavier","It removes every risk","It avoids route planning"],"correct_index":0},
 {"id":105,"question":"Does manual-handling training remove the need to redesign an unsafe task?","options":["Yes, once signed","No; the task still needs suitable risk controls","Only for managers","Only under 18"],"correct_index":1}
]$$::jsonb),
('slips_trips',$$[
 {"id":101,"question":"A spill cannot be cleaned immediately. What is the best temporary response?","options":["Put a small sign nearby and leave","Isolate/guard the area effectively and arrange prompt cleaning","Cover it with cardboard","Tell staff verbally only"],"correct_index":1},
 {"id":102,"question":"Why can a warning sign be insufficient on its own?","options":["It does not remove or fully control the hazard","Signs are illegal","Customers cannot read","It dries the floor"],"correct_index":0},
 {"id":103,"question":"A cable crosses a busy route. What is the preferred action?","options":["Tape a note to it","Remove/reroute it or use a suitable engineered control","Step over it","Dim the lights"],"correct_index":1},
 {"id":104,"question":"Grease repeatedly builds up in one area. What should management review?","options":["Only footwear","The source, cleaning method, timing and wider controls","Whether to stop recording it","The wall colour"],"correct_index":1},
 {"id":105,"question":"What should happen after cleaning a spill?","options":["Remove controls immediately","Check the floor is safe before reopening the area","Leave equipment in the route","Record it as dry without checking"],"correct_index":1}
]$$::jsonb),
('hot_drinks_equipment',$$[
 {"id":101,"question":"A steam wand behaves unusually. What should the worker do?","options":["Test it with a hand","Stop using it, make it safe and report the fault","Increase the pressure","Ask a customer to check it"],"correct_index":1},
 {"id":102,"question":"What reduces scald risk when handing over a hot drink?","options":["Overfilling the cup","Correct fill level, secure lid/cup and clear communication","Holding it by the lid","Passing it over another person"],"correct_index":1},
 {"id":103,"question":"Hot liquid spills near a live electrical item. What is the priority?","options":["Wipe underneath while powered","Keep people clear, follow isolation/emergency procedure and report it","Pour cold water on the equipment","Continue service"],"correct_index":1},
 {"id":104,"question":"Why must equipment guards and safety features remain in place?","options":["They are part of controlling foreseeable risks","Only for appearance","They slow work","They replace training"],"correct_index":0},
 {"id":105,"question":"A worker has not been trained on a hot appliance. What should happen?","options":["Use it while watching someone else","Receive instruction, supervised practice and confirmation of competence first","Read one label during service","Use it only when busy"],"correct_index":1}
]$$::jsonb),
('young_workers_new_starters',$$[
 {"id":101,"question":"What should determine whether a young worker can do a higher-risk task?","options":["How busy the shop is","A suitable risk assessment, instruction, supervision and competence","Whether they volunteer","Their height only"],"correct_index":1},
 {"id":102,"question":"A new starter says they understand but cannot demonstrate the safe shutdown. What should happen?","options":["Let them work alone","Repeat training and supervised practice before authorisation","Ask them to sign anyway","Remove the shutdown step"],"correct_index":1},
 {"id":103,"question":"Can an under-18 worker use an adult 48-hour opt-out?","options":["Yes with a manager signature","No","Only in December","Only for split shifts"],"correct_index":1},
 {"id":104,"question":"Why should supervision be reviewed rather than assumed once?","options":["Capability and task risks can change","To reduce records","Only for payroll","It is optional"],"correct_index":0},
 {"id":105,"question":"A young worker is asked to use an unfamiliar chemical alone. What is the best response?","options":["Try a small amount","Stop and get suitable instruction/supervision under the assessed controls","Copy another worker from a distance","Mix it with water"],"correct_index":1}
]$$::jsonb),
('equality_dignity_harassment',$$[
 {"id":101,"question":"A colleague says repeated comments are unwanted, but the speaker calls them jokes. What matters most?","options":["The speaker's label","The conduct, context and its effect, handled under the proper procedure","How many people laughed","Whether it happened off rota"],"correct_index":1},
 {"id":102,"question":"A manager receives a harassment concern about a popular employee. What should happen?","options":["Dismiss it to protect morale","Take it seriously, safeguard those involved and follow a fair confidential process","Post details to the team","Require confrontation immediately"],"correct_index":1},
 {"id":103,"question":"What is victimisation in this context?","options":["Treating someone badly because they raised/supported a discrimination concern","Giving normal feedback","Changing a menu","Requesting training"],"correct_index":0},
 {"id":104,"question":"Can conduct outside the workplace still affect workplace harassment duties?","options":["Never","It can, depending on its connection and circumstances","Only if uniform is worn","Only managers"],"correct_index":1},
 {"id":105,"question":"Why should complaint information be shared only on a need-to-know basis?","options":["To support privacy, fairness and a proper process","To stop all investigation","To hide outcomes permanently","To avoid recording facts"],"correct_index":0}
]$$::jsonb),
('whistleblowing',$$[
 {"id":101,"question":"A worker reports falsified food-safety records affecting customers. Which route may apply?","options":["Only a personal grievance","Whistleblowing/protected disclosure because it may involve public-interest wrongdoing","Holiday request","Rota swap"],"correct_index":1},
 {"id":102,"question":"What distinguishes many whistleblowing concerns from personal grievances?","options":["They concern wrongdoing in the public interest","They must be anonymous","They involve pay only","They cannot concern safety"],"correct_index":0},
 {"id":103,"question":"A colleague is threatened after raising a qualifying concern. What should happen?","options":["Treat it as normal disagreement","Escalate and protect against detriment under the procedure","Remove their shifts","Publish their identity"],"correct_index":1},
 {"id":104,"question":"Should a worker deliberately make allegations they know are false?","options":["Yes, if anonymous","No; concerns should be raised honestly with the information available","Only about managers","Only verbally"],"correct_index":1},
 {"id":105,"question":"A disclosure involves immediate danger. What is the priority?","options":["Wait for the next meeting","Use the urgent safety/emergency escalation route as well as recording the concern","Keep it private from responsible people","Post online first"],"correct_index":1}
]$$::jsonb),
('working_time_breaks_fatigue',$$[
 {"id":101,"question":"An adult is rostered for 6 hours and 15 minutes with no break. What should management check?","options":["Nothing because it is under 8 hours","The entitlement to an uninterrupted 20-minute rest break","Only travel time","Whether the worker brought food"],"correct_index":1},
 {"id":102,"question":"Why are accurate clock records important?","options":["They support pay, working-time monitoring and fatigue controls","Only to rank staff","To replace the rota","They are optional"],"correct_index":0},
 {"id":103,"question":"A worker reports fatigue after repeated long shifts. What is the best response?","options":["Tell them to work faster","Review hours, rest, workload and controls rather than ignoring the warning","Delete the clock records","Ask them to waive all rest"],"correct_index":1},
 {"id":104,"question":"Does an adult opt-out remove every working-time and health-and-safety duty?","options":["Yes","No; rest and health-and-safety duties still matter","Only on Sundays","Only for managers"],"correct_index":1},
 {"id":105,"question":"Which statement about young workers is correct?","options":["They always follow adult limits","They have additional limits and rest protections that must be checked separately","They need no records","They can opt out of all limits"],"correct_index":1}
]$$::jsonb)
)
update public.backoffice_training_modules m
set quiz=m.quiz||a.extra, updated_at=now()
from additions a
where m.module_key=a.module_key and jsonb_array_length(coalesce(m.quiz,'[]'::jsonb))<8;
