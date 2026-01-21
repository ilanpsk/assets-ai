from typing import List
from langchain_core.messages import SystemMessage
from langchain_core.tools import BaseTool
from langchain_core.language_models import BaseChatModel
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from app.ai.core.state import AgentState
from app.ai.prompts.system import SYSTEM_PROMPT

def create_agent_graph(llm: BaseChatModel, tools: List[BaseTool]):
    """
    Builds the LangGraph workflow with the given LLM and Tools.
    """
    
    # Bind tools to LLM
    llm_with_tools = llm.bind_tools(tools)

    # 1. Define Nodes
    def call_model(state: AgentState):
        messages = state["messages"]
        
        # Inject system prompt dynamically with user context
        sys_msg = SystemMessage(content=SYSTEM_PROMPT.format(
            user_id=state["user_id"], 
            role=state["role"]
        ))
        
        # Prepend system message to conversation history and invoke LLM
        response = llm_with_tools.invoke([sys_msg] + messages)
        return {"messages": [response]}

    tool_node = ToolNode(tools)

    # 2. Define Graph
    workflow = StateGraph(AgentState)

    workflow.add_node("agent", call_model)
    workflow.add_node("tools", tool_node)

    workflow.set_entry_point("agent")

    # 3. Define Edges
    def should_continue(state: AgentState):
        last_message = state["messages"][-1]
        if last_message.tool_calls:
            return "tools"
        return END

    workflow.add_conditional_edges(
        "agent",
        should_continue,
        ["tools", END]
    )
    
    workflow.add_edge("tools", "agent")

    return workflow.compile()




