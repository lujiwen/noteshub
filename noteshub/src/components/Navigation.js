import React from 'react'
import { connect } from 'react-redux'
import { Menu, Icon } from 'antd';
import {toggleLeftDrawer} from "../actions/NavigationAction";
import { Avatar } from 'antd';
import { Input } from 'antd';

const Search = Input.Search;

const SubMenu = Menu.SubMenu;
const MenuItemGroup = Menu.ItemGroup;


const Navigation = ({ dispatch }) => {

  this.toggleDraw = function (e) {
    console.log("navigation toggleDraw :" + e)
    dispatch(toggleLeftDrawer)
  }

  return (
    <div>
      <Menu
          // selectedKeys={[this.state.current]}
          mode="horizontal"
      >
        <Menu.Item key="mail" onClick = {this.toggleDraw}>
          <Icon type="mail" />墨韵
        </Menu.Item>

        <Menu.Item key="search">
          <Search
              placeholder="输入曲谱或者作者名"
              onSearch={value => console.log(value)}
              style={{ width: 200 }}
          />
        </Menu.Item>
        <Menu.Item key="app" disabled>
          <Icon type="appstore" />Navigation Two
        </Menu.Item>
        <SubMenu title={<span className="submenu-title-wrapper"><Icon type="setting" />Navigation Three - Submenu</span>}>
          <MenuItemGroup title="Item 1">
            <Menu.Item key="setting:1">Option 1</Menu.Item>
            <Menu.Item key="setting:2">Option 2</Menu.Item>
          </MenuItemGroup>
          <MenuItemGroup title="Item 2">
            <Menu.Item key="setting:3">Option 3</Menu.Item>
            <Menu.Item key="setting:4">Option 4</Menu.Item>
          </MenuItemGroup>
        </SubMenu>
        <Menu.Item key="alipay">
          <a href="https://ant.design" target="_blank" rel="noopener noreferrer">Navigation Four - Link</a>
        </Menu.Item>
        <Menu.Item key="login" align="right">
          <Avatar shape="square" icon="user"></Avatar>
        </Menu.Item>
      </Menu>
    </div>
  )
}


export default connect()(Navigation)
